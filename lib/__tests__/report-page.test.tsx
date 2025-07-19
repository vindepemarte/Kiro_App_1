/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { databaseService } from '@/lib/database';
import ReportPage from '@/app/report/[id]/page';
import { Meeting } from '@/lib/types';

// Mock the dependencies
jest.mock('@/contexts/auth-context');
jest.mock('@/lib/database');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

const mockMeeting: Meeting = {
  id: 'test-meeting-id',
  title: 'Test Meeting',
  date: new Date('2024-01-15'),
  summary: 'This is a test meeting summary with multiple paragraphs.\n\nSecond paragraph of the summary.',
  actionItems: [
    {
      id: 'action-1',
      description: 'Complete project documentation',
      owner: 'John Doe',
      deadline: new Date('2024-01-22'),
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'action-2',
      description: 'Review code changes',
      priority: 'medium',
      status: 'pending',
    },
  ],
  rawTranscript: 'This is the raw transcript of the meeting...',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

describe('ReportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      signOut: jest.fn(),
      reauthenticate: jest.fn(),
      initializeAuth: jest.fn(),
    });

    render(<ReportPage params={{ id: 'test-id' }} />);

    expect(screen.getByText('Meeting Report')).toBeInTheDocument();
    // Should show skeleton loading states
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error state when meeting is not found', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', isAnonymous: true },
      loading: false,
      error: null,
      signOut: jest.fn(),
      reauthenticate: jest.fn(),
      initializeAuth: jest.fn(),
    });

    mockDatabaseService.getMeetingById.mockResolvedValue(null);

    render(<ReportPage params={{ id: 'non-existent-id' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Meeting not found/)).toBeInTheDocument();
    });
  });

  it('displays meeting data when loaded successfully', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', isAnonymous: true },
      loading: false,
      error: null,
      signOut: jest.fn(),
      reauthenticate: jest.fn(),
      initializeAuth: jest.fn(),
    });

    mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);

    render(<ReportPage params={{ id: 'test-meeting-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    });

    // Check meeting details
    expect(screen.getByText('Monday, January 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('This is a test meeting summary with multiple paragraphs.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph of the summary.')).toBeInTheDocument();

    // Check action items
    expect(screen.getByText('Complete project documentation')).toBeInTheDocument();
    expect(screen.getByText('Review code changes')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
    expect(screen.getByText('high priority')).toBeInTheDocument();
    expect(screen.getByText('medium priority')).toBeInTheDocument();

    // Check statistics
    expect(screen.getByText('2')).toBeInTheDocument(); // Total action items
    expect(screen.getByText('1')).toBeInTheDocument(); // High priority items
  });

  it('handles database errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', isAnonymous: true },
      loading: false,
      error: null,
      signOut: jest.fn(),
      reauthenticate: jest.fn(),
      initializeAuth: jest.fn(),
    });

    mockDatabaseService.getMeetingById.mockRejectedValue(new Error('Database connection failed'));

    render(<ReportPage params={{ id: 'test-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows export functionality', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', isAnonymous: true },
      loading: false,
      error: null,
      signOut: jest.fn(),
      reauthenticate: jest.fn(),
      initializeAuth: jest.fn(),
    });

    mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);

    render(<ReportPage params={{ id: 'test-meeting-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Export Report')).toBeInTheDocument();
    });

    // Should have export buttons
    expect(screen.getAllByText(/Export/)).toHaveLength(2); // Header and sidebar
  });
});