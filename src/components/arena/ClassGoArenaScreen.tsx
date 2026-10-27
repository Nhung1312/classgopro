import React, { useState } from 'react';
import { ClassRoom } from '../../types';
import {
  ArenaMatchSettings,
  ArenaQuestion,
  ArenaTeamState,
} from '../../types/arenaTypes';
import { ArenaSetupModal } from './ArenaSetupModal';
import { ClassGoArenaGame } from './ClassGoArenaGame';
import { ArenaVictoryScreen } from './ArenaVictoryScreen';
import { SAMPLE_ARENA_QUESTIONS } from './arenaQuestionService';
import { ARENA_TEAM_PRESETS } from './arenaData';

interface ClassGoArenaScreenProps {
  classes: ClassRoom[];
  activeClassId?: string;
  ownerId?: string;
  onClose: () => void;
}

export const ClassGoArenaScreen: React.FC<ClassGoArenaScreenProps> = ({
  classes,
  activeClassId,
  ownerId,
  onClose,
}) => {
  const [phase, setPhase] = useState<'SETUP' | 'GAME' | 'VICTORY'>('SETUP');

  // Match configurations
  const [team1Config, setTeam1Config] = useState({
    name: ARENA_TEAM_PRESETS[0].team1.name,
    mascotId: ARENA_TEAM_PRESETS[0].team1.mascotId,
    color: ARENA_TEAM_PRESETS[0].team1.color,
  });

  const [team2Config, setTeam2Config] = useState({
    name: ARENA_TEAM_PRESETS[0].team2.name,
    mascotId: ARENA_TEAM_PRESETS[0].team2.mascotId,
    color: ARENA_TEAM_PRESETS[0].team2.color,
  });

  const [questions, setQuestions] = useState<ArenaQuestion[]>(SAMPLE_ARENA_QUESTIONS);
  const [matchSettings, setMatchSettings] = useState<ArenaMatchSettings>({
    questionCount: 5,
    timePerQuestion: 30,
    basePoints: 10,
    speedBonus: false,
    speedBonusPoints: 5,
    doubleFinalQuestion: true,
    soundEnabled: true,
    reducedMotion: false,
    autoReveal: true,
    showMascots: true,
  });

  // Finished Match States
  const [finishedTeam1, setFinishedTeam1] = useState<ArenaTeamState | null>(null);
  const [finishedTeam2, setFinishedTeam2] = useState<ArenaTeamState | null>(null);

  const handleStartMatch = (
    t1: { name: string; mascotId: string; color: string },
    t2: { name: string; mascotId: string; color: string },
    qList: ArenaQuestion[],
    settings: ArenaMatchSettings
  ) => {
    setTeam1Config(t1);
    setTeam2Config(t2);
    setQuestions(qList);
    setMatchSettings(settings);
    setPhase('GAME');
  };

  const handleFinishMatch = (t1State: ArenaTeamState, t2State: ArenaTeamState) => {
    setFinishedTeam1(t1State);
    setFinishedTeam2(t2State);
    setPhase('VICTORY');
  };

  const handlePlayAgain = () => {
    setPhase('SETUP');
  };

  return (
    <>
      {phase === 'SETUP' && (
        <ArenaSetupModal
          isOpen={true}
          onClose={onClose}
          classes={classes}
          activeClassId={activeClassId}
          ownerId={ownerId}
          onStartMatch={handleStartMatch}
        />
      )}

      {phase === 'GAME' && (
        <ClassGoArenaGame
          questions={questions}
          team1Config={team1Config}
          team2Config={team2Config}
          settings={matchSettings}
          onFinishMatch={handleFinishMatch}
          onExitGame={onClose}
        />
      )}

      {phase === 'VICTORY' && finishedTeam1 && finishedTeam2 && (
        <ArenaVictoryScreen
          team1={finishedTeam1}
          team2={finishedTeam2}
          questions={questions}
          onPlayAgain={handlePlayAgain}
          onExit={onClose}
        />
      )}
    </>
  );
};
