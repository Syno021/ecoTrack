import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone:false
})
export class HomePage implements OnInit {
  isWeb: boolean = false;
  stats = [
    { value: '2.3K', label: 'Pickups' },
    { value: '78%', label: 'Recycled' },
    { value: '156', label: 'Reports' }
  ];
  
  // Animation control
  showAnimation = true;
  
  // Recycling guide content
  selectedRecyclingSegment: string = 'basics';
  
  recyclingCategories = [
    {
      icon: 'newspaper-outline',
      color: 'primary',
      title: 'Paper',
      description: 'Newspapers, magazines, office paper, cardboard'
    },
    {
      icon: 'water-outline',
      color: 'secondary',
      title: 'Plastic',
      description: 'Bottles, containers (types 1-2), clean packaging'
    },
    {
      icon: 'wine-outline',
      color: 'tertiary',
      title: 'Glass',
      description: 'Bottles, jars (remove lids and rinse)'
    },
    {
      icon: 'hardware-chip-outline',
      color: 'success',
      title: 'Metal',
      description: 'Aluminum cans, steel cans, clean foil'
    },
    {
      icon: 'leaf-outline',
      color: 'warning',
      title: 'Organic',
      description: 'Food waste, yard trimmings, compostable items'
    },
    {
      icon: 'flash-outline',
      color: 'danger',
      title: 'E-Waste',
      description: 'Electronics, batteries, light bulbs'
    }
  ];
  
  recyclingTips = [
    {
      title: 'Rinse containers before recycling',
      content: 'Food residue can contaminate other recyclables and lead to rejection of entire batches.',
      icon: 'water-outline',
      color: 'primary'
    },
    {
      title: 'Remove caps and lids',
      content: 'Separate plastic caps from bottles and metal lids from jars for better sorting.',
      icon: 'git-compare-outline',
      color: 'secondary'
    },
    {
      title: 'Flatten cardboard boxes',
      content: 'Save space in recycling bins and collection trucks by flattening cardboard.',
      icon: 'contract-outline',
      color: 'tertiary'
    },
    {
      title: 'No plastic bags in recycling bins',
      content: 'They jam sorting equipment. Return them to grocery stores instead.',
      icon: 'close-circle-outline',
      color: 'danger'
    }
  ];
  
  recyclingFAQs = [
    {
      question: 'What plastics can be recycled?',
      answer: 'Most communities accept plastics with recycling numbers 1 (PET) and 2 (HDPE). Check the number inside the triangle symbol on the bottom of containers.',
      expanded: false
    },
    {
      question: 'Should I remove labels from containers?',
      answer: 'It\'s not necessary to remove paper labels from containers. Modern recycling facilities can separate these materials during processing.',
      expanded: false
    },
    {
      question: 'Can I recycle pizza boxes?',
      answer: 'Clean parts of pizza boxes can be recycled. Cut away and discard greasy or food-stained sections, as they contaminate the recycling process.',
      expanded: false
    },
    {
      question: 'What about bottle caps?',
      answer: 'Best practice varies by location. Generally, plastic caps should be left on plastic bottles, while metal caps should be recycled separately with other metals.',
      expanded: false
    }
  ];

  constructor(private platform: Platform) {}

  ngOnInit() {
    this.isWeb = this.platform.is('desktop') || this.platform.is('mobileweb');
  }
  
  segmentChanged(event: any) {
    this.selectedRecyclingSegment = event.detail.value;
  }
  
  toggleFAQ(faq: any) {
    faq.expanded = !faq.expanded;
  }
}