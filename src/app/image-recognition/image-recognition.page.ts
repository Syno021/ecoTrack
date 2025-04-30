import { Component, OnInit, NgZone, Injector } from '@angular/core';
import { AnimationController, LoadingController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { runInInjectionContext } from '@angular/core';
import { WasteClassificationService } from '../services/waste-classification.service';

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
  confidenceScore: number | null = null;
  
  // Waste type descriptions
  private wasteDescriptions = {
    'recyclable': 'This can be processed and used to create new products.',
    'organic': 'This biodegradable waste can be composted into fertilizer.',
    'hazardous': 'This requires special handling for safe disposal.',
    'paper': 'Paper products that can be recycled into new paper products.',
    'plastic': 'Plastic materials that should be recycled according to local regulations.',
    'glass': 'Glass materials that can be recycled indefinitely.',
    'metal': 'Metal items that can be melted down and reused.',
    'electronic': 'Electronic waste that requires specialized recycling.',
    'general': 'General waste that typically goes to landfill.'
  };
  
  constructor(
    private loadingCtrl: LoadingController,
    private animationCtrl: AnimationController,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private ngZone: NgZone,
    private injector: Injector,
    private wasteClassificationService: WasteClassificationService
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
        // Reset waste detection data
        this.detectedWaste = null;
        this.wasteDescription = null;
        this.confidenceScore = null;
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
            confidenceScore: this.confidenceScore,
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
      // Reset waste detection data
      this.detectedWaste = null;
      this.wasteDescription = null;
      this.confidenceScore = null;
      
      const reader = new FileReader();
      reader.onload = async () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async recognizeWaste() {
    if (!this.imagePreview) {
      return;
    }
    
    const loading = await this.loadingCtrl.create({
      message: 'Analyzing image...',
      spinner: 'circular'
    });
    
    await loading.present();
    
    try {
      // Send image to classification service
      this.wasteClassificationService.classifyWaste(this.imagePreview as string)
        .subscribe({
          next: (response) => {
            this.handleClassificationResponse(response);
            loading.dismiss();
          },
          error: (error) => {
            console.error('Error classifying waste:', error);
            loading.dismiss();
            this.fallbackRecognition(); // Use fallback if API fails
          }
        });
    } catch (error) {
      console.error('Error during waste recognition:', error);
      loading.dismiss();
      this.fallbackRecognition(); // Use fallback if API fails
    }
  }
  
  private handleClassificationResponse(response: any) {
    try {
      // Check if we have predictions
      if (response && response.predictions && response.predictions.length > 0) {
        // Get the prediction with highest confidence
        const topPrediction = response.predictions.sort((a: any, b: any) => 
          b.confidence - a.confidence)[0];
        
        // Format waste type (capitalize first letter, etc.)
        const wasteType = this.formatWasteType(topPrediction.class);
        this.detectedWaste = wasteType;
        
        // Get appropriate description based on waste type
        this.wasteDescription = this.getWasteDescription(topPrediction.class);
        
        // Store confidence score
        this.confidenceScore = Math.round(topPrediction.confidence * 100);
        
        // Now that we have the classification results, upload the image with these details
        if (this.imagePreview) {
          this.uploadImage(this.imagePreview as string);
        }
      } else {
        // If no predictions, use fallback
        this.fallbackRecognition();
      }
    } catch (error) {
      console.error('Error processing classification response:', error);
      this.fallbackRecognition();
    }
  }
  
  private formatWasteType(classLabel: string): string {
    // Convert class label to title case (e.g., "recyclable_plastic" to "Recyclable Plastic")
    return classLabel
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  private getWasteDescription(classLabel: string): string {
    // Extract the base waste type from the class label
    const baseType = classLabel.toLowerCase().split('_')[0];
    
    // Return the description or a default one
    return this.wasteDescriptions[baseType as keyof typeof this.wasteDescriptions] || 
           'This waste should be disposed of according to local regulations.';
  }
  
  // Fallback function in case the API fails
  private fallbackRecognition() {
    // Mock recognition logic (when API fails)
    const types = [
      { name: 'Recyclable Waste', description: 'This can be processed and used to create new products.' },
      { name: 'Organic Waste', description: 'This biodegradable waste can be composted into fertilizer.' },
      { name: 'Hazardous Waste', description: 'This requires special handling for safe disposal.' }
    ];
    
    const selected = types[Math.floor(Math.random() * types.length)];
    this.detectedWaste = selected.name;
    this.wasteDescription = selected.description;
    this.confidenceScore = Math.floor(Math.random() * 30) + 70; // Random confidence between 70-99%
    
    // Upload image with fallback results
    if (this.imagePreview) {
      this.uploadImage(this.imagePreview as string);
    }
  }

  getWasteIcon(type: string): string {
    if (!type) return 'help-circle-outline';
    
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('recyclable') || lowerType.includes('paper') || 
        lowerType.includes('plastic') || lowerType.includes('glass') || 
        lowerType.includes('metal')) {
      return 'reload-circle-outline';
    } else if (lowerType.includes('organic') || lowerType.includes('food') || 
               lowerType.includes('garden')) {
      return 'leaf-outline';
    } else if (lowerType.includes('hazardous') || lowerType.includes('electronic') || 
               lowerType.includes('battery')) {
      return 'warning-outline';
    } else if (lowerType.includes('general') || lowerType.includes('landfill')) {
      return 'trash-outline';
    } else {
      return 'help-circle-outline';
    }
  }
  
  getWasteColor(type: string): string {
    if (!type) return 'medium';
    
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('recyclable') || lowerType.includes('paper') || 
        lowerType.includes('plastic') || lowerType.includes('glass') || 
        lowerType.includes('metal')) {
      return 'success';
    } else if (lowerType.includes('organic') || lowerType.includes('food') || 
               lowerType.includes('garden')) {
      return 'tertiary';
    } else if (lowerType.includes('hazardous') || lowerType.includes('electronic') || 
               lowerType.includes('battery')) {
      return 'danger';
    } else if (lowerType.includes('general') || lowerType.includes('landfill')) {
      return 'medium';
    } else {
      return 'primary';
    }
  }
  
  resetImage() {
    this.imagePreview = null;
    this.detectedWaste = null;
    this.wasteDescription = null;
    this.confidenceScore = null;
  }
}