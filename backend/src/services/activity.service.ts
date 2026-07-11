import prisma from '../utils/db';
import { logger } from '../utils/logger';

interface CreateActivityParams {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
}

export const ActivityService = {
  create: async (params: CreateActivityParams) => {
    try {
      const activity = await prisma.activity.create({ data: params });
      logger.audit('ACTIVITY_CREATED', null as any, { activityId: activity.id, actorUserId: params.actorUserId });
    } catch (err) {
      logger.error('Failed to create activity', err);
    }
  }
};
