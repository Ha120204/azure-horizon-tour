import { formatDate } from '../../_lib/helpers';
export { getDateRange, getGranularity, formatVND, formatAxisVND, formatDate } from '../../_lib/helpers';

export const getPeriodLabel = (isCustom: boolean, activeDays: number, from: string, to: string) => {
    if (!isCustom) return `${activeDays} ngày gần nhất`;
    return `${formatDate(from)} - ${formatDate(to)}`;
};
