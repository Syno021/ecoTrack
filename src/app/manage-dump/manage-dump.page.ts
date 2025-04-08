import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastController, LoadingController } from '@ionic/angular';

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

  constructor(
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
  }

  async submitPickupRequest() {
    // Validate form inputs
    if (!this.pickupRequest.name || !this.pickupRequest.phone || !this.pickupRequest.address || !this.pickupRequest.wasteType) {
      this.presentToast('Please fill in all required fields', 'danger');
      return;
    }

    // Show loading indicator
    const loading = await this.loadingController.create({
      message: 'Submitting request...',
      duration: 2000
    });
    await loading.present();

    // Simulate API call
    setTimeout(async () => {
      await loading.dismiss();
      
      // Display success message
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
    }, 2000);
  }

  async submitIssueReport() {
    // Validate form inputs
    if (!this.issueReport.name || !this.issueReport.email || !this.issueReport.issueType || 
        !this.issueReport.location || !this.issueReport.description) {
      this.presentToast('Please fill in all required fields', 'danger');
      return;
    }

    // Show loading indicator
    const loading = await this.loadingController.create({
      message: 'Submitting report...',
      duration: 2000
    });
    await loading.present();

    // Simulate API call
    setTimeout(async () => {
      await loading.dismiss();
      
      // Display success message
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
    }, 2000);
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