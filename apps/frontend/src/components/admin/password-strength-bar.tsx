'use client';
import React from "react"
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const PasswordStrengthBar = ({ password }) => {
  const [strength, setStrength] = useState<any>({
    score: 0,
    label: '',
    color: '',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        label: '',
        color: '',
        requirements: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false
        }
      });
      return;
    }

    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    let score = 0;
    let label = '';
    let color = '';

    if (metRequirements <= 2) {
      score = 1;
      label = 'Weak';
      color = 'bg-red-500';
    } else if (metRequirements <= 3) {
      score = 2;
      label = 'Fair';
      color = 'bg-orange-500';
    } else if (metRequirements <= 4) {
      score = 3;
      label = 'Good';
      color = 'bg-yellow-500';
    } else {
      score = 4;
      label = 'Strong';
      color = 'bg-green-500';
    }

    setStrength({
      score,
      label,
      color,
      requirements
    });
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          strength.score === 1 ? 'text-red-500' :
          strength.score === 2 ? 'text-orange-500' :
          strength.score === 3 ? 'text-yellow-500' :
          'text-green-500'
        }`}>
          {strength.label}
        </span>
      </div>

      {/* Requirements List */}
      <div className="grid grid-cols-1 gap-1 text-xs">
        <div className={`flex items-center gap-2 ${
          strength.requirements.length ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          {strength.requirements.length ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          At least 8 characters
        </div>
        <div className={`flex items-center gap-2 ${
          strength.requirements.uppercase ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          {strength.requirements.uppercase ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          One uppercase letter
        </div>
        <div className={`flex items-center gap-2 ${
          strength.requirements.lowercase ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          {strength.requirements.lowercase ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          One lowercase letter
        </div>
        <div className={`flex items-center gap-2 ${
          strength.requirements.number ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          {strength.requirements.number ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          One number
        </div>
        <div className={`flex items-center gap-2 ${
          strength.requirements.special ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          {strength.requirements.special ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          One special character
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthBar; 