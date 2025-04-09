// home.page.ts
import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  isWeb: boolean = false;

  constructor(private platform: Platform) { }

  ngOnInit() {
    this.isWeb = this.platform.is('desktop') || this.platform.is('mobileweb');
  }
}