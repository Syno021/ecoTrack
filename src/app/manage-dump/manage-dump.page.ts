import { Component, OnInit, Injector, runInInjectionContext, NgZone } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-manage-dump',
  templateUrl: './manage-dump.page.html',
  styleUrls: ['./manage-dump.page.scss'],
  standalone: false,

})
export class ManageDumpPage implements OnInit {
  // Default segment selection
  selectedSegment: string = 'request';

  // Pickup request form data
  pickupRequest = {
    name: '',
    phone: '',
    address: '',
    date: new Date().toISOString(),
    wasteType: '',
    otherWasteType: '',
    notes: ''
  };

  // Issue reporting form data
  issueReport = {
    name: '',
    email: '',
    phone: '',
    issueType: '',
    location: '',
    date: new Date().toISOString(),
    description: '',
    priority: 'medium',
    photos: [] as string[]
  };

  // Add user data properties
  currentUser: any = null;
  userEmail: string = '';

  constructor(
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private fireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private ngZone: NgZone,
    private injector: Injector 
  ) { }

  async ngOnInit() {
    // Check authentication status
    this.fireAuth.authState.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userEmail = user.email || '';
      } else {
        this.router.navigate(['/home']);
      }
    });
  }

  async submitPickupRequest() {
    if (!this.currentUser) {
      this.router.navigate(['/home']);
      return;
    }

    // Validate form inputs
    if (!this.pickupRequest.name || !this.pickupRequest.phone || !this.pickupRequest.address || !this.pickupRequest.wasteType) {
      this.presentToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Submitting request...'
    });
    await loading.present();

    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.firestore.collection('requests').add({
            ...this.pickupRequest,
            userId: this.currentUser.uid,
            userEmail: this.userEmail,
            createdAt: new Date(),
            status: 'pending'
          });
        });
      });

      await loading.dismiss();
      this.presentToast('Pickup request submitted successfully!', 'success');
      
      // Reset form
      this.pickupRequest = {
        name: '',
        phone: '',
        address: '',
        date: new Date().toISOString(),
        wasteType: '',
        otherWasteType: '',
        notes: ''
      };
    } catch (error) {
      await loading.dismiss();
      this.presentToast('Error submitting request. Please try again.', 'danger');
      console.error('Error:', error);
    }
  }

  async submitIssueReport() {
    if (!this.currentUser) {
      this.router.navigate(['/home']);
      return;
    }

    // Validate form inputs
    if (!this.issueReport.name || !this.issueReport.email || !this.issueReport.issueType || 
        !this.issueReport.location || !this.issueReport.description) {
      this.presentToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Submitting report...'
    });
    await loading.present();

    try {
      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.firestore.collection('reports').add({
            ...this.issueReport,
            userId: this.currentUser.uid,
            userEmail: this.userEmail,
            createdAt: new Date(),
            status: 'pending'
          });
        });
      });

      await loading.dismiss();
      this.presentToast('Issue report submitted successfully!', 'success');
      
      // Reset form
      this.issueReport = {
        name: '',
        email: '',
        phone: '',
        issueType: '',
        location: '',
        date: new Date().toISOString(),
        description: '',
        priority: 'medium',
        photos: []
      };
    } catch (error) {
      await loading.dismiss();
      this.presentToast('Error submitting report. Please try again.', 'danger');
      console.error('Error:', error);
    }
  }

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (image.dataUrl) {
        this.issueReport.photos.push(image.dataUrl);
      }
    } catch (error) {
      console.error('Error taking photo', error);
      this.presentToast('Could not take photo. Please try again.', 'warning');
    }
  }

  removePhoto(index: number) {
    this.issueReport.photos.splice(index, 1);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}