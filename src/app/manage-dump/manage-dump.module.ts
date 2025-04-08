import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageDumpPageRoutingModule } from './manage-dump-routing.module';

import { ManageDumpPage } from './manage-dump.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageDumpPageRoutingModule
  ],
  declarations: [ManageDumpPage]
})
export class ManageDumpPageModule {}
