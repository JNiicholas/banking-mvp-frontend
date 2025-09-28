import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, FloatLabelModule],
  templateUrl: './example.html',
  styleUrl: './example.scss'
})
export class Example {
  value = ''; // bound by [(ngModel)]

  handleClick() {
    console.log('Button clicked! value=', this.value);
  }
}