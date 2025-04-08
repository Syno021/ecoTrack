import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ManageDumpPage } from './manage-dump.page';

const routes: Routes = [
  {
    path: '',
    component: ManageDumpPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageDumpPageRoutingModule {}
