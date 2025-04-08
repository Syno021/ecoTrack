/* Component */
import { Component, OnInit } from '@angular/core';
import { AnimationController, LoadingController } from '@ionic/angular';

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
    private animationCtrl: AnimationController
  ) {}

  ngOnInit() {}

  async onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Reset previous result
      this.detectedWaste = null;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
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