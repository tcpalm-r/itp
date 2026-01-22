'use client';

import { useState } from 'react';
import { ITPTabNav } from './ITPTabNav';
import { ITPSelfAssessment } from './ITPSelfAssessment';
import { ITPTeamAssessment } from './ITPTeamAssessment';

interface ITPManagerViewProps {
  userId: string;
  userName?: string;
  isAdmin: boolean;
}

export function ITPManagerView({ userId, userName, isAdmin }: ITPManagerViewProps) {
  const [activeTab, setActiveTab] = useState<'self' | 'team'>('self');

  return (
    <div>
      <ITPTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'self' ? (
        <ITPSelfAssessment
          employeeId={userId}
          employeeName={userName}
          currentUserId={userId}
          isViewOnly={false}
          isAdmin={isAdmin}
        />
      ) : (
        <ITPTeamAssessment managerId={userId} />
      )}
    </div>
  );
}
