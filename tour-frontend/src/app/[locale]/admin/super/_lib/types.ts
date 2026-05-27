export type Tone = 'blue' | 'amber' | 'red' | 'emerald' | 'violet';

export type OverviewData = {
    generatedAt: string;
    riskIndex: number;
    status: 'stable' | 'warning' | 'critical';
    kpis: {
        monthlyRevenue: number;
        activeAdmins: number;
        totalAdminAccounts: number;
        interventionRequired: number;
        failedPaymentRate: number;
        auditEventsToday: number;
        highRiskEventsToday: number;
        supportEscalations: number;
        roleChangesToday: number;
    };
    alerts: {
        failedPayments: number;
        overduePendingBookings: number;
        sensitiveActionsToday: number;
        pendingContent: number;
        pendingTours: number;
        pendingArticles: number;
        assistedDraftPending: number;
        supportOverdue: number;
    };
    systemHealth: { label: string; status: string; meta: string; tone: Tone }[];
    operationalRisks: {
        key: string;
        severity: string;
        title: string;
        detail: string;
        owner: string;
        due: string;
        icon: string;
        tone: Tone;
        href: string;
    }[];
    highRiskActions: {
        id: number;
        actor: string;
        actorRole: string;
        action: string;
        resource: string;
        severity: string;
        ip: string;
        time: string;
        href: string;
    }[];
};
