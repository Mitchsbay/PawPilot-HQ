import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { 
  HelpCircle, Shield, MessageCircle, Mail, Phone, 
  Book, AlertTriangle, Flag, Lock, Eye, Users,
  ChevronRight, ChevronDown, Search, ExternalLink,
  FileText, Video, Headphones, Clock, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved';
  created_at: string;
}

const HelpPage: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'safety' | 'privacy' | 'terms'>('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Contact form
  const [contactData, setContactData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'How do I create a pet profile?',
      answer: 'To create a pet profile, go to the "My Pets" section and click "Add Pet". Fill in your pet\'s information including name, species, breed, and upload a photo. You can also set privacy settings for each pet profile.',
      category: 'pets'
    },
    {
      id: '2',
      question: 'How do I report a lost pet?',
      answer: 'Go to the "Lost & Found" section and click "Report Pet". Fill in all the details about your lost pet including last seen location, description, and contact information. Add a clear photo to help others identify your pet.',
      category: 'lost-found'
    },
    {
      id: '3',
      question: 'How do I change my privacy settings?',
      answer: 'Visit your Settings page and go to the Privacy tab. Here you can control who can see your profile, posts, and contact you. You can set different privacy levels for different types of content.',
      category: 'privacy'
    },
    {
      id: '4',
      question: 'How do I join or create groups?',
      answer: 'In the Groups section, you can browse public groups and request to join them. To create a group, click "Create Group" and fill in the details. You can make groups public or private.',
      category: 'groups'
    },
    {
      id: '5',
      question: 'How do I track my pet\'s health records?',
      answer: 'Use the Health Tracking section to log veterinary visits, vaccinations, medications, and other health events. You can upload documents and photos, and set reminders for future appointments.',
      category: 'health'
    },
    {
      id: '6',
      question: 'How do I delete my account?',
      answer: 'Go to Settings > Account and scroll down to find the "Delete Account" option. This action is permanent and will remove all your data including pets, posts, and messages.',
      category: 'account'
    },
    {
      id: '7',
      question: 'How do I report inappropriate content?',
      answer: 'Click the three dots menu on any post, comment, or profile and select "Report". Choose the appropriate reason and provide additional details. Our moderation team will review all reports.',
      category: 'safety'
    },
    {
      id: '8',
      question: 'How do I make a donation?',
      answer: 'Visit the Donations section to browse verified causes. Click "Donate Now" on any cause, enter your donation amount and optional message. You can choose to donate anonymously if preferred.',
      category: 'donations'
    },
    {
      id: '9',
      question: 'How do I create photo albums?',
      answer: 'Go to the Photos section and click "Create Album". Give your album a name, description, and set privacy settings. You can then add multiple photos with captions and tag your pets.',
      category: 'photos'
    },
    {
      id: '10',
      question: 'How do I upload pet reels?',
      answer: 'In the Reels section, click the "+" button to create a new reel. Upload a video file (MP4/MOV), add a caption, and set visibility. Your reel will appear in the community feed.',
      category: 'reels'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'pets', name: 'Pet Profiles', icon: Users },
    { id: 'health', name: 'Health Tracking', icon: Shield },
    { id: 'lost-found', name: 'Lost & Found', icon: AlertTriangle },
    { id: 'groups', name: 'Groups & Events', icon: Users },
    { id: 'privacy', name: 'Privacy & Security', icon: Lock },
    { id: 'safety', name: 'Safety & Reporting', icon: Flag },
    { id: 'donations', name: 'Donations', icon: HelpCircle },
    { id: 'photos', name: 'Photo Albums', icon: HelpCircle },
    { id: 'reels', name: 'Pet Reels', icon: Video },
    { id: 'account', name: 'Account Settings', icon: Users }
  ];

  const contactCategories = [
    { value: 'general', label: 'General Question' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'account', label: 'Account Problem' },
    { value: 'safety', label: 'Safety Concern' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'bug', label: 'Bug Report' }
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!contactData.subject.trim() || !contactData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // In a real implementation, this would create a support ticket
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Support ticket created! We\'ll get back to you within 24 hours.');
      setShowContactForm(false);
      setContactData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Safety Center</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions, learn about safety guidelines, 
          and get support for using PawPilot HQ.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex flex-wrap justify-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'faq'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HelpCircle className="h-4 w-4 inline mr-2" />
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'contact'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle className="h-4 w-4 inline mr-2" />
            Contact
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'safety'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Safety
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'privacy'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock className="h-4 w-4 inline mr-2" />
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'terms'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Terms
          </button>
        </div>
      </div>

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="max-w-4xl mx-auto">
          {/* Search */}
          <div className="relative mb-8">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search frequently asked questions..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{faq.question}</h3>
                  {expandedFAQ === faq.id ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedFAQ === faq.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200"
                    >
                      <div className="px-6 py-4">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or browse all questions above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Options */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <MessageCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Support Ticket</h3>
                      <p className="text-gray-600 text-sm">Get help with technical issues or account problems</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Support Ticket
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-3 rounded-full">
                      <Mail className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Email Support</h3>
                      <p className="text-gray-600 text-sm">Send us an email for general inquiries</p>
                    </div>
                  </div>
                  <a
                    href="mailto:support@pawpilothq.com"
                    className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-block text-center"
                  >
                    support@pawpilothq.com
                  </a>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <Book className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Help Documentation</h3>
                      <p className="text-gray-600 text-sm">Browse our comprehensive help guides</p>
                    </div>
                  </div>
                  <button className="mt-4 w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    View Documentation
                  </button>
                </div>
              </div>

              {/* Response Times */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Response Times</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Support Tickets</span>
                    <span className="font-medium text-gray-900">Within 24 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Email Support</span>
                    <span className="font-medium text-gray-900">1-2 business days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Safety Reports</span>
                    <span className="font-medium text-gray-900">Within 4 hours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Contact</h3>
              
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={contactData.category}
                    onChange={(e) => setContactData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {contactCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactData.subject}
                    onChange={(e) => setContactData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    value={contactData.message}
                    onChange={(e) => setContactData(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please provide as much detail as possible..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={contactData.priority}
                    onChange={(e) => setContactData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low - General question</option>
                    <option value="medium">Medium - Issue affecting usage</option>
                    <option value="high">High - Urgent problem</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Safety Tab */}
      {activeTab === 'safety' && (
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <div className="text-center">
              <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Community Safety Guidelines</h2>
              <p className="text-gray-600">
                Our community guidelines help ensure PawPilot HQ remains a safe, 
                welcoming space for all pet lovers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Be Respectful</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li>• Treat all community members with kindness and respect</li>
                  <li>• No harassment, bullying, or discriminatory language</li>
                  <li>• Respect different opinions about pet care approaches</li>
                  <li>• Keep discussions constructive and helpful</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Protect Privacy</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li>• Don't share personal information publicly</li>
                  <li>• Respect others' privacy settings</li>
                  <li>• Only share photos of pets with owner permission</li>
                  <li>• Report suspicious or inappropriate behavior</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Safety First</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li>• Always meet in public places when meeting community members</li>
                  <li>• Verify credentials of pet service providers</li>
                  <li>• Trust your instincts about suspicious behavior</li>
                  <li>• Report emergency situations to local authorities</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Flag className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Report Issues</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li>• Report inappropriate content or behavior immediately</li>
                  <li>• Use the report button on posts, comments, and profiles</li>
                  <li>• Provide detailed information when reporting</li>
                  <li>• Block users who make you uncomfortable</li>
                </ul>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">Emergency Situations</h3>
                  <p className="text-red-700 mb-4">
                    If you encounter an emergency involving animal abuse, neglect, or immediate danger 
                    to pets or people, contact your local authorities immediately. Do not rely solely 
                    on our platform reporting system for urgent situations.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Emergency:</strong> Call 911</p>
                    <p><strong>Animal Control:</strong> Contact your local animal control office</p>
                    <p><strong>ASPCA Hotline:</strong> 1-888-426-4435</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <Lock className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h2>
              <p className="text-gray-600">
                Last updated: January 2025
              </p>
            </div>

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Information We Collect</h3>
              <p className="text-gray-700 mb-6">
                We collect information you provide directly to us, such as when you create an account, 
                add pet profiles, post content, or contact us for support. This includes your name, 
                email address, pet information, photos, and any other information you choose to provide.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">How We Use Your Information</h3>
              <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
                <li>Provide and maintain our services</li>
                <li>Connect you with other pet owners in your community</li>
                <li>Send you important updates about our services</li>
                <li>Improve our platform based on usage patterns</li>
                <li>Ensure the safety and security of our community</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Information Sharing</h3>
              <p className="text-gray-700 mb-6">
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this policy. We may share information in 
                response to legal requests or to protect our rights and the safety of our users.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Privacy Controls</h3>
              <p className="text-gray-700 mb-6">
                You have control over your privacy settings. You can choose who can see your profile, 
                posts, and pet information. You can also control who can contact you and how you 
                receive notifications.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Security</h3>
              <p className="text-gray-700 mb-6">
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. However, no method of 
                transmission over the internet is 100% secure.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h3>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at 
                privacy@pawpilothq.com or through our support system.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms Tab */}
      {activeTab === 'terms' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h2>
              <p className="text-gray-600">
                Last updated: January 2025
              </p>
            </div>

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acceptance of Terms</h3>
              <p className="text-gray-700 mb-6">
                By accessing and using PawPilot HQ, you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please 
                do not use this service.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Responsibilities</h3>
              <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
                <li>Provide accurate and truthful information</li>
                <li>Maintain the security of your account</li>
                <li>Respect other users and follow community guidelines</li>
                <li>Not use the service for illegal or harmful activities</li>
                <li>Not spam or harass other users</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Guidelines</h3>
              <p className="text-gray-700 mb-6">
                You are responsible for the content you post on PawPilot HQ. Content must be appropriate, 
                legal, and not infringe on the rights of others. We reserve the right to remove content 
                that violates our guidelines.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Intellectual Property</h3>
              <p className="text-gray-700 mb-6">
                The service and its original content, features, and functionality are and will remain 
                the exclusive property of PawPilot HQ and its licensors. The service is protected by 
                copyright, trademark, and other laws.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Limitation of Liability</h3>
              <p className="text-gray-700 mb-6">
                In no event shall PawPilot HQ, nor its directors, employees, partners, agents, suppliers, 
                or affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
                damages, including without limitation, loss of profits, data, use, goodwill, or other 
                intangible losses.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Changes to Terms</h3>
              <p className="text-gray-700 mb-6">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                If a revision is material, we will try to provide at least 30 days notice prior to any new 
                terms taking effect.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <p className="text-gray-700">
                If you have any questions about these Terms of Service, please contact us at 
                legal@pawpilothq.com or through our support system.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      <AnimatePresence>
        {showContactForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowContactForm(false)}
                className="fixed inset-0 bg-black bg-opacity-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Create Support Ticket</h2>
                  <button
                    onClick={() => setShowContactForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={contactData.category}
                      onChange={(e) => setContactData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {contactCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactData.subject}
                      onChange={(e) => setContactData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      value={contactData.message}
                      onChange={(e) => setContactData(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Please provide as much detail as possible..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={contactData.priority}
                      onChange={(e) => setContactData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low - General question</option>
                      <option value="medium">Medium - Issue affecting usage</option>
                      <option value="high">High - Urgent problem</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Submit Ticket</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HelpPage;