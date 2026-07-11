interface CreateActivityParams {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
}
export declare const ActivityService: {
    create: (params: CreateActivityParams) => Promise<void>;
};
export {};
//# sourceMappingURL=activity.service.d.ts.map