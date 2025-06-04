import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss','./auth.page2.scss'],
  standalone: false,
})
export class AuthPage implements OnInit {
  activeTab: string = 'login';
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  // Validation patterns
  private readonly emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly namePattern = /^[a-zA-Z\s'-]{2,50}$/;
  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private fireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private ngZone: NgZone,
    private injector: Injector
  ) {}

  ngOnInit() {
    this.initForms();
    // Clear any persisting auth state on init
    this.clearAllAuthData();
  }

  initForms() {
    // Initialize login form with enhanced validation
    this.loginForm = this.formBuilder.group({
      email: ['', [
        Validators.required,
        this.customEmailValidator.bind(this),
        Validators.maxLength(254)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(128)
      ]]
    });

    // Initialize register form with comprehensive validation
    this.registerForm = this.formBuilder.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        this.customNameValidator.bind(this),
        this.noLeadingTrailingSpaceValidator
      ]],
      email: ['', [
        Validators.required,
        this.customEmailValidator.bind(this),
        Validators.maxLength(254)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128),
        this.strongPasswordValidator.bind(this)
      ]],
      confirmPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128)
      ]]
    }, { 
      validators: [this.passwordMatchValidator.bind(this)]
    });

    // Add real-time validation for password confirmation
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.registerForm.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  // Custom Validators
  customEmailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const email = control.value.trim().toLowerCase();
    
    // Check for basic format
    if (!this.emailPattern.test(email)) {
      return { invalidEmail: true };
    }
    
    // Check for common email issues
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      return { invalidEmail: true };
    }
    
    // Check for disposable email domains (basic list)
    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      return { disposableEmail: true };
    }
    
    return null;
  }

  customNameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const name = control.value.trim();
    
    if (!this.namePattern.test(name)) {
      return { invalidName: true };
    }
    
    // Check for suspicious patterns
    if (/\d/.test(name)) {
      return { nameContainsNumbers: true };
    }
    
    if (name.length < 2) {
      return { nameTooShort: true };
    }
    
    return null;
  }

  strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const password = control.value;
    const errors: ValidationErrors = {};
    
    if (password.length < 8) {
      errors['minLength'] = true;
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors['requiresLowercase'] = true;
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors['requiresUppercase'] = true;
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors['requiresNumber'] = true;
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors['requiresSpecialChar'] = true;
    }
    
    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors['tooCommon'] = true;
    }
    
    // Check for sequential characters
    if (/123456|abcdef|qwerty/i.test(password)) {
      errors['sequential'] = true;
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }

  noLeadingTrailingSpaceValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value;
    if (value !== value.trim()) {
      return { hasLeadingTrailingSpace: true };
    }
    
    return null;
  }

  passwordMatchValidator(formGroup: AbstractControl): ValidationErrors | null {
    if (!(formGroup instanceof FormGroup)) return null;
    
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    
    if (!password || !confirmPassword) return null;
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Input sanitization
  sanitizeInput(value: string): string {
    if (!value) return '';
    return value.trim().replace(/[<>\"']/g, '');
  }

  switchTab(tabName: string) {
    if (this.isSubmitting) return;
    
    this.activeTab = tabName;
    // Reset forms when switching tabs
    if (tabName === 'login') {
      this.registerForm.reset();
    } else {
      this.loginForm.reset();
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Enhanced login method with better error handling
  async login() {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Logging in...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.clearAllAuthData();

      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          const email = this.sanitizeInput(this.loginForm.value.email?.toLowerCase());
          const password = this.loginForm.value.password;

          if (!email || !password) {
            throw new Error('Email and password are required');
          }

          const userCredential = await this.fireAuth.signInWithEmailAndPassword(email, password);
          
          if (userCredential.user) {
            await this.handleSuccessfulLogin(userCredential.user);
          } else {
            throw new Error('Authentication failed - no user returned');
          }
        });
      });
    } catch (error: any) {
      console.error('Login error:', error);
      await this.clearAllAuthData();
      
      let errorMessage = 'Login failed. Please try again.';
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      this.showAlert('Login Failed', errorMessage);
    } finally {
      this.isSubmitting = false;
      loading.dismiss();
    }
  }

  private async handleSuccessfulLogin(user: any) {
    await this.ngZone.run(() => {
      return runInInjectionContext(this.injector, async () => {
        try {
          const userDoc = await this.firestore.collection('users').doc(user.uid).get().toPromise();
          const userData = userDoc?.data() as { role?: string; fullName?: string; email?: string };
          
          if (!userData) {
            throw new Error('User data not found in database');
          }
          
          // Verify user data integrity
          if (userData.email?.toLowerCase() !== user.email?.toLowerCase()) {
            console.warn('Email mismatch detected');
          }
          
          const userRole = userData.role || 'user';
          
          // Store user session data securely
          const sessionData = {
            uid: user.uid,
            email: user.email,
            role: userRole,
            fullName: userData.fullName || '',
            loginTime: new Date().toISOString()
          };
          
          localStorage.setItem('user-session', JSON.stringify(sessionData));
          localStorage.setItem('user-role', userRole);
          
          // Navigate based on role
          if (userRole === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/manage-dump']);
          }
          
          console.log(`User logged in successfully with role: ${userRole}`);
        } catch (error) {
          console.error('Error handling successful login:', error);
          throw error;
        }
      });
    });
  }

  // Enhanced register method
  async register() {
    if (this.registerForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Creating account...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          const formValue = this.registerForm.value;
          const email = this.sanitizeInput(formValue.email?.toLowerCase());
          const password = formValue.password;
          const fullName = this.sanitizeInput(formValue.fullName);

          // Additional validation
          if (!email || !password || !fullName) {
            throw new Error('All fields are required');
          }

          // Check if email exists
          const existingUsers = await this.firestore.collection('users', ref => 
            ref.where('email', '==', email).limit(1)
          ).get().toPromise();

          if (existingUsers && !existingUsers.empty) {
            throw new Error('An account with this email already exists');
          }

          const userCredential = await this.fireAuth.createUserWithEmailAndPassword(email, password);
          
          if (userCredential.user) {
            await this.createUserProfile(userCredential.user, fullName, email);
            
            // Clear the form and switch to login tab
            this.registerForm.reset();
            this.loginForm.reset();
            this.activeTab = 'login';
            
            this.showAlert('Success', 'Account created successfully! Please log in with your new credentials.');
          } else {
            throw new Error('Failed to create user account');
          }
        });
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      this.showAlert('Registration Failed', errorMessage);
    } finally {
      this.isSubmitting = false;
      loading.dismiss();
    }
  }

  private async createUserProfile(user: any, fullName: string, email: string) {
    await this.ngZone.run(() => {
      return runInInjectionContext(this.injector, async () => {
        const userData = {
          fullName,
          email,
          createdAt: new Date(),
          userId: user.uid,
          role: 'user',
          isActive: true,
          lastLoginAt: null,
          profileCompleted: false
        };

        await this.firestore.collection('users').doc(user.uid).set(userData);
        console.log('User profile created successfully');
      });
    });
  }

  // Enhanced social sign-in with better error handling
  async loginWithGoogle() {
    if (this.isSubmitting) return;
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    await this.socialSignIn(provider, 'Google');
  }
  
  async loginWithFacebook() {
    if (this.isSubmitting) return;
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    await this.socialSignIn(provider, 'Facebook');
  }
  
  async loginWithLinkedIn() {
    if (this.isSubmitting) return;
    const provider = new OAuthProvider('microsoft.com');
    await this.socialSignIn(provider, 'LinkedIn');
  }
  
  private async socialSignIn(provider: any, providerName: string) {
    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: `Signing in with ${providerName}...`,
      spinner: 'crescent'
    });
    await loading.present();
  
    try {
      await this.clearAllAuthData();

      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          const auth = getAuth();
          const result = await signInWithPopup(auth, provider);
          
          if (!result.user || !result.user.email) {
            throw new Error('Unable to retrieve user information from ' + providerName);
          }
      
          await this.handleSocialUserCreation(result.user);
        });
      });
      
    } catch (error: any) {
      console.error(`${providerName} login error:`, error);
      await this.clearAllAuthData();
      
      let errorMessage = `Failed to sign in with ${providerName}`;
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      }
      
      this.showAlert('Login Failed', errorMessage);
    } finally {
      this.isSubmitting = false;
      loading.dismiss();
    }
  }

  private async handleSocialUserCreation(user: any) {
    await this.ngZone.run(() => {
      return runInInjectionContext(this.injector, async () => {
        const userRef = this.firestore.collection('users').doc(user.uid);
        const userSnapshot = await userRef.get().toPromise();

        const userData = {
          email: user.email,
          fullName: user.displayName || 'Social User',
          createdAt: new Date(),
          role: 'user',
          userId: user.uid,
          isActive: true,
          lastLoginAt: new Date(),
          profileCompleted: true
        };

        if (!userSnapshot?.exists) {
          await userRef.set(userData);
        } else {
          // Update last login time
          await userRef.update({ lastLoginAt: new Date() });
        }

        // Set session data
        const sessionData = {
          uid: user.uid,
          email: user.email,
          role: 'user',
          fullName: userData.fullName,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('user-session', JSON.stringify(sessionData));
        localStorage.setItem('user-role', 'user');

        this.router.navigate(['/manage-dump']);
      });
    });
  }

  // Utility methods
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Enhanced alert method
  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  forgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  // Comprehensive auth state clearing
  async clearAllAuthData() {
    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.fireAuth.signOut();
          
          const authKeys = ['user-role', 'user-session', 'firebase:authUser', 'firebase:host'];
          authKeys.forEach(key => {
            localStorage.removeItem(key);
            Object.keys(localStorage).forEach(storageKey => {
              if (storageKey.includes(key) || storageKey.includes('firebase')) {
                localStorage.removeItem(storageKey);
              }
            });
          });
          
          sessionStorage.clear();
        });
      });
      
      console.log('Auth state cleared successfully');
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }

  // Form field error checking methods
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${fieldName} is required`;
    if (errors['email'] || errors['invalidEmail']) return 'Please enter a valid email address';
    if (errors['disposableEmail']) return 'Disposable email addresses are not allowed';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required`;
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters allowed`;
    if (errors['invalidName']) return 'Please enter a valid name (letters, spaces, hyphens only)';
    if (errors['nameContainsNumbers']) return 'Name should not contain numbers';
    if (errors['hasLeadingTrailingSpace']) return 'Remove leading/trailing spaces';
    if (errors['requiresLowercase']) return 'Password must contain at least one lowercase letter';
    if (errors['requiresUppercase']) return 'Password must contain at least one uppercase letter';
    if (errors['requiresNumber']) return 'Password must contain at least one number';
    if (errors['requiresSpecialChar']) return 'Password must contain at least one special character (@$!%*?&)';
    if (errors['tooCommon']) return 'Password is too common, please choose a different one';
    if (errors['sequential']) return 'Password should not contain sequential characters';

    return 'Invalid input';
  }
}