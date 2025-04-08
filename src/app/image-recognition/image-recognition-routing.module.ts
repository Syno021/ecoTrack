import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ImageRecognitionPage } from './image-recognition.page';

const routes: Routes = [
  {
    path: '',
    component: ImageRecognitionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ImageRecognitionPageRoutingModule {}
