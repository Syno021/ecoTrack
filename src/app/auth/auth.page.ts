import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: false,
})
export class AuthPage implements OnInit {
  activeTab: string = 'login';

  constructor() { }

  ngOnInit() {
  }

  switchTab(tabName: string) {
    this.activeTab = tabName;
  }
}