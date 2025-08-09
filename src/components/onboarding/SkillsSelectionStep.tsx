import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { validateAndSanitizeSkillName } from '@/utils/inputSanitization';

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface SkillsSelectionStepProps {
  onComplete: () => void;
  onClose: () => void;
}

const SkillsSelectionStep: React.FC<SkillsSelectionStepProps> = ({ onComplete, onClose }) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [skillCategories, setSkillCategories] = useState<Record<string, Skill[]>>({});

  useEffect(() => {
    loadSkills();
    loadUserSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('category, name');

      if (error) throw error;

      setSkills(data || []);
      
      // Group skills by category
      const grouped = (data || []).reduce((acc, skill) => {
        if (!acc[skill.category]) {
          acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
      }, {} as Record<string, Skill[]>);
      
      setSkillCategories(grouped);
    } catch (error) {
      console.error('Error loading skills:', error);
    }
  };

  const loadUserSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('user_skills')
        .select('skill_id')
        .eq('user_id', user?.id);

      if (error) throw error;

      setSelectedSkills(data?.map(item => item.skill_id) || []);
    } catch (error) {
      console.error('Error loading user skills:', error);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const addCustomSkill = async () => {
    // Validate and sanitize the input
    const validation = validateAndSanitizeSkillName(customSkill);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid skill name",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    const sanitizedSkillName = validation.sanitizedValue!;

    try {
      // Check for duplicate skills (case-insensitive)
      const { data: existingSkills } = await supabase
        .from('skills')
        .select('name')
        .ilike('name', sanitizedSkillName);

      if (existingSkills && existingSkills.length > 0) {
        toast({
          title: "Skill already exists",
          description: "This skill is already in the database.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('skills')
        .insert([{
          name: sanitizedSkillName,
          category: 'Custom'
        }])
        .select()
        .single();

      if (error) throw error;

      setSkills(prev => [...prev, data]);
      setSkillCategories(prev => ({
        ...prev,
        'Custom': [...(prev.Custom || []), data]
      }));
      setSelectedSkills(prev => [...prev, data.id]);
      setCustomSkill('');
      
      toast({
        title: "Custom skill added",
        description: `"${sanitizedSkillName}" has been added to your skills.`
      });
    } catch (error) {
      console.error('Error adding custom skill:', error);
      toast({
        title: "Error",
        description: "Failed to add custom skill. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (selectedSkills.length < 3) {
      toast({
        title: "Minimum 3 skills required",
        description: "Please select at least 3 skills to continue.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Remove existing user skills
      await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', user?.id);

      // Add new user skills
      const userSkillsData = selectedSkills.map(skillId => ({
        user_id: user?.id,
        skill_id: skillId
      }));

      const { error } = await supabase
        .from('user_skills')
        .insert(userSkillsData);

      if (error) throw error;

      // Update profile completion status
      await supabase
        .from('profiles')
        .update({ skills_completed: true })
        .eq('id', user?.id);

      toast({
        title: "Skills saved successfully",
        description: `You've selected ${selectedSkills.length} skills.`
      });

      onComplete();
    } catch (error) {
      console.error('Error saving skills:', error);
      toast({
        title: "Error",
        description: "Failed to save your skills.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Select Your Skills</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Choose at least 3 skills that represent your expertise (Selected: {selectedSkills.length})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {Object.entries(skillCategories).map(([category, categorySkills]) => (
              <div key={category}>
                <h3 className="font-semibold mb-3 text-primary">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleSkill(skill.id)}
                    >
                      <Checkbox
                        checked={selectedSkills.includes(skill.id)}
                        onChange={() => toggleSkill(skill.id)}
                      />
                      <span className="text-sm">{skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Skill Input */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 text-primary">Add Custom Skill</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a custom skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                />
                <Button onClick={addCustomSkill} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected Skills Display */}
            {selectedSkills.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Selected Skills ({selectedSkills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map(skillId => {
                    const skill = skills.find(s => s.id === skillId);
                    return skill ? (
                      <Badge
                        key={skillId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleSkill(skillId)}
                      >
                        {skill.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <div className="p-6 border-t bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedSkills.length < 3 && (
                <span className="text-orange-600">
                  ⚠️ {3 - selectedSkills.length} more skill(s) required
                </span>
              )}
              {selectedSkills.length >= 3 && (
                <span className="text-success">✓ Minimum requirement met</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading || selectedSkills.length < 3}>
                {loading ? 'Saving...' : 'Save Skills'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SkillsSelectionStep;