import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController, LoadingController } from '@ionic/angular';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage {
  email: string = '';
  message: string = '';
  error: string = '';
  isLoading: boolean = false;

  constructor(
    private afAuth: AngularFireAuth, 
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router
  ) {}

  async sendResetEmail() {
    if (!this.email) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    
    try {
      // Show loading indicator
      const loading = await this.loadingController.create({
        message: 'Sending reset link...',
        spinner: 'circles'
      });
      await loading.present();
      
      // Try to send the reset email
      await this.afAuth.sendPasswordResetEmail(this.email, {
        url: window.location.origin + '/login',  // This is the URL to redirect after password reset
        handleCodeInApp: true  // Set to true to handle the code in app
      });
      
      await loading.dismiss();
      this.isLoading = false;
      
      this.message = 'A password reset link has been sent to your email.';
      this.error = '';
      this.showToast('Reset link sent successfully! Please check your email inbox and spam folder.', 'success');
      
      // Clear the email field after successful sending
      this.email = '';
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
      
    } catch (err) {
      this.isLoading = false;
      const error = err as { code?: string };
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/user-not-found') {
        this.error = 'No user found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        this.error = 'Please enter a valid email address.';
      } else {
        this.error = 'Failed to send reset email. Please try again.';
      }
      
      this.message = '';
      this.showToast('Error: ' + this.error, 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 5000, // Increased duration for better readability
      position: 'top',
      buttons: [{
        text: 'Close',
        role: 'cancel'
      }]
    });
    toast.present();
  }
}