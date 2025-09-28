import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { McpagentApiService, AskApiMcpagentAskPostRequestParams } from '../../api/api/mcpagent.service';
import { AgentUIResponse } from '../../api/model/agent-ui-response';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-mcp-agent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, TableModule, ChartModule, BadgeModule, ProgressSpinnerModule],
  templateUrl: './mcp-agent.html',
  styleUrls: ['./mcp-agent.scss']
})
export class McpAgent {
  public readonly Array = Array;
  private fb = inject(FormBuilder);
  private api = inject(McpagentApiService);

  form = this.fb.group({
    question: ['', [Validators.required, Validators.minLength(3)]],
  });

  loading = signal(false);
  answer = signal<AgentUIResponse | null>(null);
  error = signal<string | null>(null);

  submit() {
    if (this.form.invalid) {
      this.error.set('Please enter a valid question.');
      return;
    }
    this.error.set(null);
    this.answer.set(null);
    this.loading.set(true);

    const params: AskApiMcpagentAskPostRequestParams = {
      askBody: {
        question: this.form.value.question!,
      },
    };

    this.api.askApiMcpagentAskPost(params).subscribe({
      next: (res) => {
        // Backend now returns AgentUIResponse directly
        this.answer.set(res as AgentUIResponse);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? err?.message ?? 'Request failed');
        this.loading.set(false);
      },
    });
  }
}