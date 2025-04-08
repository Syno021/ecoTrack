import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ImageRecognitionPageRoutingModule } from './image-recognition-routing.module';

import { ImageRecognitionPage } from './image-recognition.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ImageRecognitionPageRoutingModule
  ],
  declarations: [ImageRecognitionPage]
})
export class ImageRecognitionPageModule {}
