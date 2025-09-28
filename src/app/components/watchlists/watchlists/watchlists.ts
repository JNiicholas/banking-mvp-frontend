import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';

// OpenAPI-generated service & models
import { WatchlistsApiService } from '../../../api/api/watchlists.service';
import {
  WatchlistOut,
  WatchlistCreate,
  WatchlistUpdate,
  AddItemsPayload,
  ReorderPayload
} from '../../../api';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-watchlists',
  standalone: true,
  imports: [CommonModule, FormsModule, TabsModule, BadgeModule],
  templateUrl: './watchlists.html',
  styleUrl: './watchlists.scss'
})
export class Watchlists implements OnInit, OnDestroy {
  private svc = inject(WatchlistsApiService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private sub?: Subscription;
  private urlSub?: Subscription;
  private navSub?: Subscription;
  activeTab = signal<number>(0);
  private _routeWatchlistId: string | null = null;
  selectedId = signal<string | null>(null);

  // state
  watchlists: WatchlistOut[] = [];
  loading = false;
  error: string | null = null;

  // simple create form model
  newName = '';
  newDescription = '';
  newTickersCSV = '';
  newIsDefault = false;

  // edit cache (inline editing support)
  editingId = signal<string | null>(null);
  editName = '';
  editDescription = '';
  editIsDefault = false;

  // create-mode if navigated to /watchlists/new
  creating = signal<boolean>(false);
  isCreating = () => this.creating();

  // track function for @for in template
  trackById = (_: number, w: any) => (w as any)?._id ?? (w as any)?.id ?? w?.name ?? _;

  // safe id accessor for template conditions
  getId = (w: any) => (w as any)?._id ?? (w as any)?.id ?? null;

  // Compute the base URL for the watchlists route (without trailing /new or /:id)
  private listBasePath(): string {
    const url = this.router.url.split('?')[0].split('#')[0];
    // Remove a trailing "/new" or a trailing "/<24-hex ObjectId>"
    return url.replace(/\/new$/i, '').replace(/\/[A-Fa-f0-9]{24}$/i, '');
  }

  private setUrlToListRoot(): void {
    this.router.navigateByUrl(this.listBasePath(), { replaceUrl: true });
  }

  private setUrlToId(id: string): void {
    this.router.navigateByUrl(`${this.listBasePath()}/${id}`, { replaceUrl: true });
  }

  ngOnInit(): void {
    // Determine mode from route: /watchlists/new OR /watchlists/:watchlistId
    const initialId = this.route.snapshot.paramMap.get('watchlistId');
    const urlSegs = this.route.snapshot.url.map(s => s.path.toLowerCase());
    const isNew = urlSegs.includes('new');

    if (isNew) {
      this.creating.set(true);
      setTimeout(() => {
        try { document.getElementById('create-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
      }, 0);
    } else {
      this.creating.set(false);
    }

    if (initialId) {
      this.selectedId.set(initialId);
      this._routeWatchlistId = initialId;
    }

    // React to param changes (e.g., navigation between IDs) and ignore "new"
    this.sub = this.route.paramMap.subscribe(pm => {
      const wid = pm.get('watchlistId');
      if (wid && wid.toLowerCase() !== 'new') {
        this._routeWatchlistId = wid;
        this.creating.set(false);
        this.selectedId.set(wid);
        // If we already have data, move the tab now; otherwise refresh will align it
        this.setActiveById(wid);
        this.cdr.detectChanges();
      }
    });

    // React to URL changes anywhere (detect '/watchlists/new' and '/watchlists/:id')
    this.navSub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((evt) => {
      const url = evt.urlAfterRedirects || evt.url;
      const isNewPath = /\/watchlists\/new(?:$|[?#/])/i.test(url);
      const matchId = url.match(/\/watchlists\/([A-Fa-f0-9]{24})(?:$|[?#/])/);
      if (isNewPath) {
        if (!this.creating()) {
          this.creating.set(true);
          this._routeWatchlistId = null;
          this.selectedId.set(null);
          setTimeout(() => {
            try { document.getElementById('create-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
          }, 0);
        }
      } else {
        // Not in create mode
        if (this.creating()) this.creating.set(false);
        if (matchId?.[1]) {
          const id = matchId[1];
          this._routeWatchlistId = id;
          this.selectedId.set(id);
          this.setActiveById(id);
        }
      }
      this.cdr.detectChanges();
    });

    this.refresh();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.urlSub?.unsubscribe();
    this.navSub?.unsubscribe();
  }

  // Set active tab by id if present in current list
  private setActiveById(id: string): void {
    const idx = this.watchlists.findIndex(w => this.getId(w) === id);
    if (idx >= 0) {
      this.activeTab.set(idx);
    }
  }

  // Handler for tab changes (bind this in template via (valueChange))
  onTabChange(idx: number): void {
    this.activeTab.set(idx);
    const w = this.watchlists[idx];
    const id = w ? this.getId(w) : null;
    if (id) {
      this.selectedId.set(id);
    }
  }

  // Leave the inline create mode and navigate back to the currently selected tab (or first available)
  exitCreateMode(): void {
    this.creating.set(false);
    this.setUrlToListRoot();
    // Keep the currently-selected tab if possible, otherwise ensure a sensible default.
    if (this.watchlists.length === 0) {
      this.activeTab.set(0);
      this.selectedId.set(null);
    } else {
      const idx = Math.max(0, Math.min(this.activeTab(), this.watchlists.length - 1));
      const current = this.watchlists[idx];
      const id = current ? this.getId(current) : null;
      if (id) {
        this.selectedId.set(id);
      } else {
        this.ensureActiveTab();
      }
    }
    this.cdr.detectChanges();
  }

  // Click handler for the "Back to lists" control inside the create form.
  // Ensures we don't accidentally submit the form and cause a full-page nav.
  onBackToLists(ev?: Event): void {
    try {
      ev?.preventDefault();
      ev?.stopPropagation();
    } catch {}
    this.exitCreateMode();
    this._routeWatchlistId = null;
  }

  private ensureActiveTab(): void {
    const lists = this.watchlists || [];
    if (lists.length === 0) {
      this.activeTab.set(0);
      return;
    }

    // 1) Route-selected id takes precedence
    if (this._routeWatchlistId) {
      const ridx = lists.findIndex(w => this.getId(w) === this._routeWatchlistId);
      if (ridx >= 0) {
        this.activeTab.set(ridx);
        this.selectedId.set(this._routeWatchlistId);
        return;
      }
    }

    // 2) Otherwise choose the first default, if any
    const defIdx = lists.findIndex(w => !!(w as any)?.isDefault);
    const idx = defIdx >= 0 ? defIdx : 0;
    this.activeTab.set(idx);
    const id = this.getId(lists[idx]);
    if (id) this.selectedId.set(id);
  }

  refresh(): void {
    this.loading = true;
    this.error = null;
    this.svc.listWatchlistsApiWatchlistsGet().subscribe({
      next: (rows: WatchlistOut[]) => {
        this.watchlists = rows ?? [];
        this.ensureActiveTab();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to load watchlists';
        console.error('listWatchlists failed', err);
        this.cdr.detectChanges();
      }
    });
  }

  // Prevent native form navigation and delegate to createWatchlist
  onCreateSubmit(ev?: Event): void {
    try { ev?.preventDefault(); ev?.stopPropagation(); } catch {}
    this.createWatchlist();
  }

  // Click-safe helper in case template uses a plain button
  onCreateClick(ev?: Event): void {
    try { ev?.preventDefault(); ev?.stopPropagation(); } catch {}
    this.createWatchlist();
  }

  // ---- Create ----
  createWatchlist(): void {
    const tickers = this.parseTickers(this.newTickersCSV);
    const payload: WatchlistCreate = {
      name: this.newName.trim(),
      description: this.newDescription?.trim() || undefined,
      tickers: tickers.length ? tickers : undefined,
      isDefault: this.newIsDefault
    };
    if (!payload.name) return;

    this.loading = true;
    this.svc.createWatchlistApiWatchlistsPost({ watchlistCreate: payload }).subscribe({
      next: (created) => {
        this.resetCreateForm();
        // Prepend newly created list and activate it
        this.watchlists = [created, ...this.watchlists];
        const newId = this.getId(created);
        this.activeTab.set(0);
        if (newId) {
          this.selectedId.set(newId);
          // Update URL without navigating
          //this.router.navigateByUrl(`${this.listBasePath()}/${newId}`, { replaceUrl: true });
        }
        // Exit create mode without any navigation
        this.creating.set(false);
        this._routeWatchlistId = null;
        // Do not navigate away; remain on the watchlists page
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to create watchlist';
        console.error('createWatchlist failed', err);
        this.cdr.detectChanges();
      }
    });
  }

  private resetCreateForm(): void {
    this.newName = '';
    this.newDescription = '';
    this.newTickersCSV = '';
    this.newIsDefault = false;
  }

  private parseTickers(csv: string): string[] {
    return (csv || '')
      .split(/[,\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => !!s);
  }

  // ---- Edit / Update ----
  beginEdit(w: WatchlistOut): void {
    this.editingId.set(w._id as any || (w as any).id || '');
    this.editName = w.name;
    this.editDescription = w.description ?? '';
    this.editIsDefault = !!w.isDefault;
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName = '';
    this.editDescription = '';
    this.editIsDefault = false;
  }

  saveEdit(w: WatchlistOut): void {
    const id = (w as any)._id || (w as any).id;
    if (!id) return;
    const patch: WatchlistUpdate = {
      name: this.editName?.trim() || undefined,
      description: this.editDescription?.trim() || undefined,
      isDefault: this.editIsDefault
    };
    this.loading = true;
    this.svc.updateWatchlistApiWatchlistsWatchlistIdPatch({
      watchlistId: id,
      watchlistUpdate: patch
    }).subscribe({
      next: (updated) => {
        // replace in local array
        this.watchlists = this.watchlists.map(x => (((x as any)._id || (x as any).id) === id) ? updated : x);
        this.cancelEdit();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to update watchlist';
        console.error('updateWatchlist failed', err);
        this.cdr.detectChanges();
      }
    });
  }

  // ---- Delete ----
  deleteWatchlist(w: WatchlistOut): void {
    const id = (w as any)._id || (w as any).id;
    if (!id) return;
    this.loading = true;
    this.svc.deleteWatchlistApiWatchlistsWatchlistIdDelete({ watchlistId: id }).subscribe({
      next: () => {
        const deletedIdx = this.watchlists.findIndex(x => (((x as any)._id || (x as any).id) === id));
        this.watchlists = this.watchlists.filter(x => (((x as any)._id || (x as any).id) !== id));
        const listLen = this.watchlists.length;
        if (listLen === 0) {
          this.activeTab.set(0);
          this.selectedId.set(null);
        } else {
          const newIdx = Math.max(0, Math.min(this.activeTab(), listLen - 1, deletedIdx));
          this.activeTab.set(newIdx);
          const nw = this.watchlists[newIdx];
          const nid = nw ? this.getId(nw) : null;
          if (nid) {
            this.selectedId.set(nid);
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to delete watchlist';
        console.error('deleteWatchlist failed', err);
        this.cdr.detectChanges();
      }
    });
  }

  // ---- Items helpers (optional, used by the template) ----
  addItems(w: WatchlistOut, csv: string): void {
    const id = (w as any)._id || (w as any).id;
    const symbols = this.parseTickers(csv);
    if (!id || symbols.length === 0) return;
    const payload: AddItemsPayload = { symbols };
    this.loading = true;
    this.svc.addItemsApiWatchlistsWatchlistIdItemsPost({
      watchlistId: id,
      addItemsPayload: payload
    }).subscribe({
      next: (updated) => {
        this.watchlists = this.watchlists.map(x => (((x as any)._id || (x as any).id) === id) ? updated : x);
        // keep selection stable
        const idx = this.watchlists.findIndex(x => (((x as any)._id || (x as any).id) === id));
        if (idx >= 0) {
          this.activeTab.set(idx);
          this.selectedId.set(id);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to add items';
        console.error('addItems failed', err);
        this.cdr.detectChanges();
      }
    });
  }

  removeItem(w: WatchlistOut, symbol: string): void {
    const id = (w as any)._id || (w as any).id;
    const sym = (symbol || '').trim().toUpperCase();
    if (!id || !sym) return;
    this.loading = true;
    this.svc.removeItemApiWatchlistsWatchlistIdItemsSymbolDelete({
      watchlistId: id,
      symbol: sym
    }).subscribe({
      next: (updated) => {
        this.watchlists = this.watchlists.map(x => (((x as any)._id || (x as any).id) === id) ? updated : x);
        // keep selection stable
        const idx = this.watchlists.findIndex(x => (((x as any)._id || (x as any).id) === id));
        if (idx >= 0) {
          this.activeTab.set(idx);
          this.selectedId.set(id);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to remove item';
        console.error('removeItem failed', err);
        this.cdr.detectChanges();
      }
    });
  }

  reorderSymbols(w: WatchlistOut, orderedSymbolsCSV: string): void {
    const id = (w as any)._id || (w as any).id;
    const symbols = this.parseTickers(orderedSymbolsCSV);
    if (!id || symbols.length === 0) return;
    const payload: ReorderPayload = { symbols };
    this.loading = true;
    this.svc.reorderItemsApiWatchlistsWatchlistIdItemsReorderPatch({
      watchlistId: id,
      reorderPayload: payload
    }).subscribe({
      next: (updated) => {
        this.watchlists = this.watchlists.map(x => (((x as any)._id || (x as any).id) === id) ? updated : x);
        // keep selection stable
        const idx = this.watchlists.findIndex(x => (((x as any)._id || (x as any).id) === id));
        if (idx >= 0) {
          this.activeTab.set(idx);
          this.selectedId.set(id);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to reorder items';
        console.error('reorderItems failed', err);
        this.cdr.detectChanges();
      }
    });
  }
}
