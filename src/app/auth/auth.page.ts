import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: false,
})
export class AuthPage implements OnInit {
  activeTab: string = 'login';
  loginForm!: FormGroup;
  registerForm!: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private fireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private ngZone: NgZone,
    private injector: Injector  // Add this line
  ) {}

  ngOnInit() {
    this.initForms();
  }

  initForms() {
    // Initialize login form
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Initialize register form
    this.registerForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  switchTab(tabName: string) {
    this.activeTab = tabName;
  }

  // Login method using Firebase Auth
  async login() {
    if (this.loginForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      await this.fireAuth.signInWithEmailAndPassword(email, password);
      this.router.navigate(['/manage-dump']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.showAlert('Login Failed', error?.message || 'An unknown error occurred');
    } finally {
      loading.dismiss();
    }
  }

  // Register method using Firebase Auth and Firestore
  async register() {
    if (this.registerForm.invalid) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating account...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { email, password, fullName } = this.registerForm.value;
      
      // Create user in Firebase Auth
      const userCredential = await this.fireAuth.createUserWithEmailAndPassword(email, password);
      
      if (userCredential.user) {
        // Wrap Firestore operations in ngZone.run and proper injection context
        await this.ngZone.run(() => {
          return runInInjectionContext(this.injector, async () => {
            if (userCredential.user) {
              await this.firestore.collection('users').doc(userCredential.user.uid).set({
                fullName,
                email,
                createdAt: new Date(),
                userId: userCredential.user.uid,
                role: 'user',
              });
            } else {
              throw new Error('User credential is null');
            }
          });
        });
      }
      
      this.showAlert('Success', 'Account created successfully!');
      this.activeTab = 'login';
      this.registerForm.reset();
    } catch (error: any) {
      console.error('Registration error:', error);
      this.showAlert('Registration Failed', error?.message || 'An unknown error occurred');
    } finally {
      loading.dismiss();
    }
  }

  // Helper method to show alerts
  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Social login methods (placeholders)
  async loginWithFacebook() {
    // Implement Facebook login logic
  }

  async loginWithGoogle() {
    // Implement Google login logic
  }

  async loginWithLinkedIn() {
    // Implement LinkedIn login logic
  }

  forgotPassword() {
    // Navigate to forgot password page or implement logic here
  }
}