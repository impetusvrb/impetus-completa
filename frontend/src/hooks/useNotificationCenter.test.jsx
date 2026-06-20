import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../services/api', () => ({
  appCommunications: {
    notifications: {
      unreadCount: vi.fn(),
      list: vi.fn(),
      markRead: vi.fn()
    }
  }
}));

vi.mock('../chat-module/hooks/useChatSocket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn()
  }))
}));

import { appCommunications } from '../services/api';
import { getSocket } from '../chat-module/hooks/useChatSocket';
import { useNotificationCenter } from './useNotificationCenter';

describe('useNotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('impetus_token', 'test-token');
    appCommunications.notifications.unreadCount.mockResolvedValue({
      data: { ok: true, unread_count: 2 }
    });
    appCommunications.notifications.list.mockResolvedValue({
      data: {
        ok: true,
        notifications: [
          { id: 'n1', text_content: 'Teste A', sent_at: '2026-06-19T10:00:00Z', read_at: null }
        ]
      }
    });
    appCommunications.notifications.markRead.mockResolvedValue({
      data: { ok: true, id: 'n1', read_at: '2026-06-19T11:00:00Z' }
    });
  });

  it('carrega unread count e lista ao montar', async () => {
    const { result } = renderHook(() => useNotificationCenter());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.items).toHaveLength(1);
    expect(appCommunications.notifications.unreadCount).toHaveBeenCalled();
    expect(appCommunications.notifications.list).toHaveBeenCalled();
  });

  it('regista listener app_notification no socket', () => {
    const socket = { on: vi.fn(), off: vi.fn() };
    getSocket.mockReturnValue(socket);
    renderHook(() => useNotificationCenter());
    expect(socket.on).toHaveBeenCalledWith('app_notification', expect.any(Function));
  });

  it('markRead decrementa contador e actualiza item', async () => {
    const { result } = renderHook(() => useNotificationCenter());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markRead('n1');
    });
    expect(appCommunications.notifications.markRead).toHaveBeenCalledWith('n1');
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.items[0].read_at).toBeTruthy();
  });
});
