/**
 * Get Actions Lambda Mock
 *
 * Requirements: 11.2 - Lambda関数モック
 */

export interface GetActionsEvent {
  goalId: string;
  actionIds: string[];
}

export interface Action {
  id: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: 'execution' | 'habit';
}

export interface GetActionsResponse {
  actions: Action[];
}

/**
 * アクション取得のモック実装
 */
export const mockGetActions = async (event: GetActionsEvent): Promise<GetActionsResponse> => {
  const actions: Action[] = event.actionIds.map((actionId, index) => ({
    id: actionId,
    title: `アクション ${index + 1}`,
    description: `目標達成のための具体的なアクション ${index + 1}`,
    background: `このアクションは目標達成に必要な要素 ${index + 1} です`,
    constraints: index % 2 === 0 ? `制約事項 ${index + 1}` : undefined,
    type: (index % 3 === 0 ? 'habit' : 'execution') as 'execution' | 'habit',
  }));

  return { actions };
};
