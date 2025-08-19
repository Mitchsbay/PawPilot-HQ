import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export type ReportableContentType = 'post' | 'comment' | 'user' | 'group' | 'event' | 'reel' | 'message';

export interface ReportData {
  contentType: ReportableContentType;
  contentId: string;
  reportedUserId?: string;
  reason: string;
  description?: string;
}

export const useReporting = () => {
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async (reportData: ReportData) => {
    if (!profile) {
      toast.error('You must be logged in to report content');
      return false;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: profile.id,
          reported_user_id: reportData.reportedUserId || null,
          content_type: reportData.contentType,
          content_id: reportData.contentId,
          reason: reportData.reason,
          description: reportData.description || null,
          status: 'pending'
        });

      if (error) {
        console.error('Error submitting report:', error);
        toast.error('Failed to submit report');
        return false;
      }

      toast.success('Report submitted successfully. Our team will review it shortly.');
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const reportReasons = {
    post: [
      'Inappropriate content',
      'Spam or misleading',
      'Harassment or bullying',
      'Animal abuse or neglect',
      'False information',
      'Copyright violation',
      'Other'
    ],
    comment: [
      'Harassment or bullying',
      'Inappropriate language',
      'Spam',
      'False information',
      'Other'
    ],
    user: [
      'Harassment or bullying',
      'Impersonation',
      'Spam behavior',
      'Inappropriate profile content',
      'Suspicious activity',
      'Other'
    ],
    group: [
      'Inappropriate content',
      'Spam or misleading',
      'Harassment environment',
      'False information',
      'Other'
    ],
    event: [
      'Inappropriate event',
      'Spam or fake event',
      'Dangerous activity',
      'False information',
      'Other'
    ],
    reel: [
      'Inappropriate content',
      'Animal abuse or neglect',
      'Spam or misleading',
      'Copyright violation',
      'Other'
    ],
    message: [
      'Harassment or bullying',
      'Inappropriate content',
      'Spam',
      'Threats',
      'Other'
    ]
  };

  return {
    submitReport,
    submitting,
    reportReasons
  };
};