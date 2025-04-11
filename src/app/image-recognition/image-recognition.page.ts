/* Component */
import { Component, OnInit, NgZone, Injector } from '@angular/core';
import { AnimationController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { runInInjectionContext } from '@angular/core';

@Component({
  selector: 'app-image-recognition',
  templateUrl: './image-recognition.page.html',
  styleUrls: ['./image-recognition.page.scss'],
  standalone: false,
})
export class ImageRecognitionPage implements OnInit {
  imagePreview: string | ArrayBuffer | null = null;
  detectedWaste: string | null = null;
  wasteDescription: string | null = null;
  
  constructor(
    private loadingCtrl: LoadingController,
    private animationCtrl: AnimationController,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private ngZone: NgZone,
    private injector: Injector
  ) {}

  ngOnInit() {}

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      this.imagePreview = image.dataUrl ?? null;
      if (image.dataUrl) {
        await this.uploadImage(image.dataUrl);
      } else {
        console.error('Image data URL is undefined.');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  }

  async uploadImage(dataUrl: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Uploading image...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      const timestamp = Date.now();
      const currentUser = await this.afAuth.currentUser;

      await this.ngZone.run(() => {
        return runInInjectionContext(this.injector, async () => {
          await this.afs.collection('images').add({
            imageData: dataUrl,
            timestamp: timestamp,
            wasteType: this.detectedWaste,
            description: this.wasteDescription,
            userId: currentUser?.uid || null,
            userEmail: currentUser?.email || null
          });
        });
      });

    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      loading.dismiss();
    }
  }

  async onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.detectedWaste = null;
      
      const reader = new FileReader();
      reader.onload = async () => {
        this.imagePreview = reader.result;
        await this.uploadImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async recognizeWaste() {
    const loading = await this.loadingCtrl.create({
      message: 'Analyzing image...',
      spinner: 'circular',
      duration: 1500
    });
    
    await loading.present();
    
    // Mock recognition logic (replace with ML or Firebase later)
    const types = [
      { name: 'Recyclable Waste', description: 'This can be processed and used to create new products.' },
      { name: 'Organic Waste', description: 'This biodegradable waste can be composted into fertilizer.' },
      { name: 'Hazardous Waste', description: 'This requires special handling for safe disposal.' }
    ];
    
    const selected = types[Math.floor(Math.random() * types.length)];
    
    await loading.onDidDismiss();
    this.detectedWaste = selected.name;
    this.wasteDescription = selected.description;
  }

  getWasteIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'recyclable waste':
        return 'reload-circle-outline';
      case 'organic waste':
        return 'leaf-outline';
      case 'hazardous waste':
        return 'warning-outline';
      default:
        return 'help-circle-outline';
    }
  }
  
  getWasteColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'recyclable waste':
        return 'success';
      case 'organic waste':
        return 'tertiary';
      case 'hazardous waste':
        return 'danger';
      default:
        return 'medium';
    }
  }
  
  resetImage() {
    this.imagePreview = null;
    this.detectedWaste = null;
  }
}