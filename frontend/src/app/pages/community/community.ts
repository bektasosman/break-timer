import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TrackingService, TrackingStatsResponse } from '../../services/tracking.service';

export interface PopularConfigItem {
  name: string;
  count: number;
  cancellationRate: number;
  percentage: number;
}

export interface HourlyChartItem {
  hour: number;
  hourLabel: string;
  count: number;
  cancellationRate: number;
  percentage: number;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './community.html',
  styleUrl: './community.css'
})
export class CommunityComponent implements OnInit, OnDestroy {
  private trackingService = inject(TrackingService);
  private document = inject(DOCUMENT);

  protected communityStats = signal<TrackingStatsResponse | null>(null);
  protected isCommunityLoading = signal<boolean>(false);
  protected isSeeding = signal<boolean>(false);
  protected popularConfigsList = signal<PopularConfigItem[]>([]);
  protected hourlyDistributionList = signal<HourlyChartItem[]>([]);
  protected hoveredHour = signal<HourlyChartItem | null>(null);

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.add('bg-stats');
    body.classList.remove('bg-work', 'bg-break', 'bg-config', 'bg-login', 'bg-register');

    this.loadCommunityStats();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('bg-stats');
  }

  protected loadCommunityStats(): void {
    this.isCommunityLoading.set(true);
    this.trackingService.loadStats().subscribe({
      next: (data) => {
        this.communityStats.set(data);
        if (data) {
          this.processCommunityData(data);
        }
        this.isCommunityLoading.set(false);
      },
      error: () => this.isCommunityLoading.set(false)
    });
  }

  protected onSeedSampleData(): void {
    this.isSeeding.set(true);
    this.trackingService.seedSampleStats().subscribe({
      next: (data) => {
        this.communityStats.set(data);
        if (data) {
          this.processCommunityData(data);
        }
        this.isSeeding.set(false);
      },
      error: () => this.isSeeding.set(false)
    });
  }

  private processCommunityData(data: TrackingStatsResponse): void {
    const configs = data.popularConfigs || {};
    const cancelRates = data.configCancellationRates || {};
    const maxCount = Math.max(...Object.values(configs), 1);

    const configList: PopularConfigItem[] = Object.keys(configs).map(name => {
      const count = configs[name] || 0;
      return {
        name,
        count,
        cancellationRate: cancelRates[name] !== undefined ? cancelRates[name] : 0,
        percentage: Math.round((count / maxCount) * 100)
      };
    });
    configList.sort((a, b) => b.count - a.count);
    this.popularConfigsList.set(configList);

    const starts = data.hourlyStartDistribution || {};
    const hourlyCancels = data.hourlyCancellationRates || {};
    const maxHourly = Math.max(...Object.values(starts), 1);

    const hoursList: HourlyChartItem[] = [];
    for (let h = 0; h < 24; h++) {
      const count = starts[h.toString()] || starts[h] || 0;
      const cancelRate = hourlyCancels[h.toString()] || hourlyCancels[h] || 0;
      hoursList.push({
        hour: h,
        hourLabel: (h < 10 ? '0' + h : '' + h) + ':00',
        count,
        cancellationRate: cancelRate,
        percentage: (count > 0) ? Math.max(10, Math.round((count / maxHourly) * 100)) : 0
      });
    }
    this.hourlyDistributionList.set(hoursList);
  }

  protected setHoveredHour(item: HourlyChartItem | null): void {
    this.hoveredHour.set(item);
  }

  protected formatSecondsCompact(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return hours + 'h ' + minutes + 'm';
    }
    if (minutes > 0) {
      return seconds > 0 ? (minutes + 'm ' + seconds + 's') : (minutes + 'm');
    }
    return seconds + 's';
  }
}
