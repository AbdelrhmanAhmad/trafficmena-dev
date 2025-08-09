import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Loader2, Plus, X, ArrowLeft, Shield } from 'lucide-react';
import { useErrorHandler } from '@/utils/errorHandling';
import { validateEventData, sanitizeText } from '@/utils/validation';
import { initializeAdminSecurity, secureAdminOperation, getStoredCSRFToken } from '@/utils/csrfProtection';
import { Alert, AlertDescription } from '@/components/ui/alert';

function AdminMeetupsNew() {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  
  // Initialize CSRF protection on component mount
  useEffect(() => {
    const initSecurity = async () => {
      const security = await initializeAdminSecurity();
      setCsrfToken(getStoredCSRFToken() || '');
      
      if (security.warnings.length > 0) {
        setSecurityWarnings(security.warnings);
        console.warn('Security warnings detected:', security.warnings);
      }
    };
    initSecurity();
  }, []);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    max_attendees: '',
    host_name: '',
    host_bio: '',
    host_image_url: '',
    what_youll_learn: [''],
    agenda: [''],
    prerequisites: '',
    meeting_link: '',
    image_url: '',
    tags: [''],
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleArrayChange = (field: 'what_youll_learn' | 'agenda' | 'tags', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'what_youll_learn' | 'agenda' | 'tags') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'what_youll_learn' | 'agenda' | 'tags', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const clearForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      location: '',
      max_attendees: '',
      host_name: '',
      host_bio: '',
      host_image_url: '',
      what_youll_learn: [''],
      agenda: [''],
      prerequisites: '',
      meeting_link: '',
      image_url: '',
      tags: [''],
    });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateEventData(formData);
    if (!validation.isValid) {
      const errors: {[key: string]: string} = {};
      validation.errors.forEach(error => {
        errors[error.field] = error.message;
      });
      setFormErrors(errors);
      
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for insertion with sanitization
      const meetupData = {
        title: sanitizeText(formData.title),
        description: formData.description ? sanitizeText(formData.description) : null,
        date: new Date(formData.date).toISOString(),
        location: formData.location ? sanitizeText(formData.location) : null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        host_name: formData.host_name ? sanitizeText(formData.host_name) : null,
        host_bio: formData.host_bio ? sanitizeText(formData.host_bio) : null,
        host_image_url: formData.host_image_url ? sanitizeText(formData.host_image_url) : null,
        what_youll_learn: formData.what_youll_learn.filter(item => sanitizeText(item)).length > 0 
          ? formData.what_youll_learn.map(item => sanitizeText(item)).filter(item => item) : null,
        agenda: formData.agenda.filter(item => sanitizeText(item)).length > 0 
          ? formData.agenda.map(item => sanitizeText(item)).filter(item => item) : null,
        prerequisites: formData.prerequisites ? sanitizeText(formData.prerequisites) : null,
        meeting_link: formData.meeting_link ? sanitizeText(formData.meeting_link) : null,
        image_url: formData.image_url ? sanitizeText(formData.image_url) : null,
        tags: formData.tags.filter(tag => sanitizeText(tag)).length > 0 
          ? formData.tags.map(tag => sanitizeText(tag)).filter(tag => tag) : null,
      };

      // Execute database operation with CSRF protection
      const result = await secureAdminOperation(async () => {
        const { data, error } = await supabase
          .from('events')
          .insert([meetupData])
          .select();

        if (error) throw error;
        return data;
      }, csrfToken);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create meetup');
      }

      // Success - show success message and navigate back
      toast({
        title: "Success",
        description: "Meetup created successfully!",
      });

      navigate('/admin/meetups');

    } catch (error) {
      const appError = handleError(error);
      toast({
        title: "Error",
        description: appError.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/meetups')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Meetups
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <CalendarPlus className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Create New Meetup</h1>
            <p className="text-gray-600">Fill out the form below to create a new meetup event</p>
          </div>
        </div>

        {/* Security Warnings */}
        {securityWarnings.length > 0 && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Security Warnings:</div>
              <ul className="mt-1 list-disc list-inside text-sm">
                {securityWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Create Meetup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Meetup Details</CardTitle>
            <CardDescription>
              Provide all the necessary information for your meetup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter meetup title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={formErrors.title ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.title && (
                    <p className="text-sm text-red-600">{formErrors.title}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={formErrors.date ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.date && (
                    <p className="text-sm text-red-600">{formErrors.date}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="Enter event location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={formErrors.location ? 'border-red-500' : ''}
                  />
                  {formErrors.location && (
                    <p className="text-sm text-red-600">{formErrors.location}</p>
                  )}
                </div>

                {/* Max Attendees */}
                <div className="space-y-2">
                  <Label htmlFor="max_attendees">Max Attendees</Label>
                  <Input
                    id="max_attendees"
                    type="number"
                    placeholder="Enter maximum number of attendees"
                    value={formData.max_attendees}
                    onChange={(e) => handleInputChange('max_attendees', e.target.value)}
                    className={formErrors.max_attendees ? 'border-red-500' : ''}
                    min="1"
                  />
                  {formErrors.max_attendees && (
                    <p className="text-sm text-red-600">{formErrors.max_attendees}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter meetup description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={formErrors.description ? 'border-red-500' : ''}
                  rows={4}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>

              {/* Host Information Section */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-semibold">Host Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Host Name */}
                  <div className="space-y-2">
                    <Label htmlFor="host_name">Host Name</Label>
                    <Input
                      id="host_name"
                      type="text"
                      placeholder="Enter host name"
                      value={formData.host_name}
                      onChange={(e) => handleInputChange('host_name', e.target.value)}
                    />
                  </div>

                  {/* Host Image URL */}
                  <div className="space-y-2">
                    <Label htmlFor="host_image_url">Host Image URL</Label>
                    <Input
                      id="host_image_url"
                      type="url"
                      placeholder="Enter host image URL"
                      value={formData.host_image_url}
                      onChange={(e) => handleInputChange('host_image_url', e.target.value)}
                    />
                  </div>
                </div>

                {/* Host Bio */}
                <div className="space-y-2">
                  <Label htmlFor="host_bio">Host Bio</Label>
                  <Textarea
                    id="host_bio"
                    placeholder="Enter host biography"
                    value={formData.host_bio}
                    onChange={(e) => handleInputChange('host_bio', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Event Details Section */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-semibold">Event Details</h3>
                
                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="image_url">Event Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    placeholder="Enter event image URL"
                    value={formData.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                  />
                </div>

                {/* Meeting Link */}
                <div className="space-y-2">
                  <Label htmlFor="meeting_link">Meeting Link</Label>
                  <Input
                    id="meeting_link"
                    type="url"
                    placeholder="Enter online meeting link"
                    value={formData.meeting_link}
                    onChange={(e) => handleInputChange('meeting_link', e.target.value)}
                  />
                </div>

                {/* Prerequisites */}
                <div className="space-y-2">
                  <Label htmlFor="prerequisites">Prerequisites</Label>
                  <Textarea
                    id="prerequisites"
                    placeholder="Enter any prerequisites for attendees"
                    value={formData.prerequisites}
                    onChange={(e) => handleInputChange('prerequisites', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* What You'll Learn */}
                <div className="space-y-2">
                  <Label>What You'll Learn</Label>
                  {formData.what_youll_learn.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Learning point ${index + 1}`}
                        value={item}
                        onChange={(e) => handleArrayChange('what_youll_learn', index, e.target.value)}
                      />
                      {formData.what_youll_learn.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('what_youll_learn', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('what_youll_learn')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Learning Point
                  </Button>
                </div>

                {/* Agenda */}
                <div className="space-y-2">
                  <Label>Agenda</Label>
                  {formData.agenda.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Agenda item ${index + 1}`}
                        value={item}
                        onChange={(e) => handleArrayChange('agenda', index, e.target.value)}
                      />
                      {formData.agenda.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('agenda', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('agenda')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Agenda Item
                  </Button>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  {formData.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Tag ${index + 1}`}
                        value={tag}
                        onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                      />
                      {formData.tags.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('tags', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('tags')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Tag
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="h-4 w-4" />
                      Create Meetup
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearForm}
                  disabled={isSubmitting}
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default AdminMeetupsNew;