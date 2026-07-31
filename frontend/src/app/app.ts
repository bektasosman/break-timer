import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class App implements OnInit {
  private document = inject(DOCUMENT);

  ngOnInit(): void {
    // Beim App-Start (und jedem F5-Reload) prüfen, welcher Tab aktiv war
    const savedTab = localStorage.getItem('activeTimerTab') || 'work';
    const body = this.document.body;

    // Den Bildschirm sofort beim allerersten Laden richtig einfärben
    if (savedTab === 'break') {
      body.classList.add('bg-break');
      body.classList.remove('bg-work');
    } else {
      body.classList.add('bg-work');
      body.classList.remove('bg-break');
    }
  }
}
