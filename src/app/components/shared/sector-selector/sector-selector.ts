import { Component, EventEmitter, Input, Output, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule, AutoComplete } from 'primeng/autocomplete';
import { StaticContentApiService } from '../../../api/api/static-content.service';

@Component({
  selector: 'app-sector-selector',
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  templateUrl: './sector-selector.html',
  styleUrl: './sector-selector.scss'
})
export class SectorSelector implements OnInit {
  private staticApi = inject(StaticContentApiService);

  /** Reference to the underlying PrimeNG AutoComplete to ensure full UI reset on clear */
  @ViewChild('ac') ac?: AutoComplete;

  /** Placeholder text */
  @Input() placeholder = 'Select sector…';
  /** Minimum chars before local filtering (kept for parity with ticker component) */
  @Input() minLength = 0;
  /** Bind an explicit input id if you want */
  @Input() inputId?: string;
  /** Disable control */
  @Input() disabled = false;

  /** Emits the picked sector (string) */
  @Output() picked = new EventEmitter<string>();
  /** Emits the raw query string every time user types (optional) */
  @Output() queryChange = new EventEmitter<string>();
  /** Emits when the clear button is clicked */
  @Output() cleared = new EventEmitter<void>();
  /** Emits when user presses Enter; sends current value */
  @Output() enter = new EventEmitter<string>();

  // Reactive state
  selected = signal<string | null>(null);
  suggestions = signal<string[]>([]);
  allSectors = signal<string[]>([]);
  loading = signal<boolean>(false);
  loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchSectorsOnce();
  }

  private fetchSectorsOnce() {
    // Fetch once; then do local filtering.
    this.loading.set(true);
    this.loadError.set(null);

    this.staticApi
      .getGicsSectorsApiStaticReferenceGicsSectorsGet('body', false, { httpHeaderAccept: 'application/json' })
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.sectors) ? res.sectors : [];
          this.allSectors.set(list);
          this.suggestions.set(list); // show all by default
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set('Failed to load sectors');
          this.allSectors.set([]);
          this.suggestions.set([]);
          this.loading.set(false);
          // Optional: console.error(err);
        },
      });
  }

  filter(e: { query: string }) {
    const q = (e?.query ?? '').trim();
    this.queryChange.emit(q);

    if (q.length < this.minLength) {
      // Show all when below minLength (or empty)
      this.suggestions.set(this.allSectors());
      return;
    }

    const qLower = q.toLowerCase();
    const filtered = this.allSectors().filter((s) => s.toLowerCase().includes(qLower));
    this.suggestions.set(filtered);
  }

  emitSelect(e: any) {
    // PrimeNG AutoComplete emits either the value directly or under e.value depending on version.
    const value: string | null = (typeof e === 'string') ? e : (e?.value ?? null);
    if (value) {
      this.selected.set(value);
      this.picked.emit(value);
    }
  }

  handleClear() {
    // Reset model
    this.selected.set(null);

    // Reset the input element in the PrimeNG widget (defensive across versions)
    try {
      // Write null into the control's model
      this.ac?.writeValue?.(null);
      // Clear the visible input field
      const el: HTMLInputElement | undefined =
        (this.ac as any)?.inputEL?.nativeElement ?? (this.ac as any)?.inputField?.nativeElement;
      if (el) el.value = '';
    } catch {
      // No-op if structure differs; model reset above is sufficient
    }

    // Reset suggestions to full list
    this.suggestions.set(this.allSectors());

    // Notify listeners
    this.queryChange.emit('');
    this.cleared.emit();
  }

  onEnterKey(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    const raw = input?.value?.trim() ?? '';
    const chosen = this.selected();

    const value = chosen ?? raw;
    if (value) this.enter.emit(value);
  }
}