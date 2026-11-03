import type { IncidentCategory } from '@/api/incidents';
import type { IconName } from '@/ui';

/**
 * How each kind of incident looks on the map and in lists.
 * Colours are distinct from each other AND from the app's emergency red/orange,
 * so a map full of reports never looks like an alarm.
 */
export const CATEGORY: Record<IncidentCategory, { label: string; color: string; icon: IconName }> = {
  HARASSMENT: { label: 'Harassment', color: '#F472B6', icon: 'front_hand' },
  STALKING: { label: 'Followed or stalked', color: '#FBBF24', icon: 'visibility' },
  POOR_LIGHTING: { label: 'Poor lighting', color: '#FDE68A', icon: 'lightbulb' },
  UNSAFE_CROWD: { label: 'Unsafe crowd', color: '#38BDF8', icon: 'groups' },
  OTHER: { label: 'Other', color: '#A78BFA', icon: 'report' },
};

export const CATEGORY_ORDER: IncidentCategory[] = ['HARASSMENT', 'STALKING', 'POOR_LIGHTING', 'UNSAFE_CROWD', 'OTHER'];
