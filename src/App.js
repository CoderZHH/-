import React, { useState, useEffect, useRef } from 'react';
import RiverCrossing from './components/RiverCrossing';
import Hints from './components/Hints';
import SuccessModal from './components/SuccessModal';
import GameControls from './components/GameControls';
import { findSolution, State, goalState } from './solver';
import { findCharacterDifferences, formatBankState } from './utils/gameUtils';
import { ICONS, getCharacterIcon } from './constants/icons';
import './App.css';

function App() {
  const riverCrossingRef = useRef(null);
  const initialState = {
    leftBank: ['农夫', '狼', '羊', '白菜'],
    rightBank: [],
    boatPosition: 'left',
    boatPassengers: []
  };

  const [gameHistory, setGameHistory] = useState([initialState]);
  const [currentStep, setCurrentStep] = useState(0);
  const [hints, setHints] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [demoTimeout, setDemoTimeout] = useState(null);
  const [currentDemoStep, setCurrentDemoStep] = useState(0);

  const DEMO_STEPS = [
    { character: '羊', from: 'left', to: 'boat' },
    { character: '农夫', from: 'left', to: 'boat' },
    { type: 'cross' },
    { character: '羊', from: 'boat', to: 'right' },
    { character: '农夫', from: 'boat', to: 'right' },
    { character: '农夫', from: 'right', to: 'boat' },
    { type: 'cross' },
    { character: '农夫', from: 'boat', to: 'left' },
    { character: '狼', from: 'left', to: 'boat' },
    { character: '农夫', from: 'left', to: 'boat' },
    { type: 'cross' },
    { character: '农夫', from: 'boat', to: 'right' },
    { character: '狼', from: 'boat', to: 'right' },
    { character: '羊', from: 'right', to: 'boat' },
    { character: '农夫', from: 'right', to: 'boat' },
    { type: 'cross' },
    { character: '农夫', from: 'boat', to: 'left' },
    { character: '羊', from: 'boat', to: 'left' },
    { character: '白菜', from: 'left', to: 'boat' },
    { character: '农夫', from: 'left', to: 'boat' },
    { type: 'cross' },
    { character: '农夫', from: 'boat', to: 'right' },
    { character: '白菜', from: 'boat', to: 'right' },
    { character: '农夫', from: 'right', to: 'boat' },
    { type: 'cross' },
    { character: '农夫', from: 'boat', to: 'left' },
    { character: '羊', from: 'left', to: 'boat' },
    { character: '农夫', from: 'left', to: 'boat' },
    { type: 'cross' },
    { character: '农夫', from: 'boat', to: 'right' },
    { character: '羊', from: 'boat', to: 'right' }
  ];

  const handleReset = () => {
    if (isDemoPlaying) {
      clearTimeout(demoTimeout);
      setDemoTimeout(null);
      setIsDemoPlaying(false);
    }
    setCurrentDemoStep(0);
    
    setGameHistory([initialState]);
    setCurrentStep(0);
    setHints([]);
  };

  const handleUndo = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDemo = () => {
    if (isDemoPlaying) {
      clearTimeout(demoTimeout);
      setDemoTimeout(null);
      setIsDemoPlaying(false);
      return;
    }

    if (currentDemoStep === 0) {
      handleReset();
      setTimeout(() => {
        setIsDemoPlaying(true);
        playNextStep(0);
      }, 100);
    } else {
      setIsDemoPlaying(true);
      playNextStep(currentDemoStep);
    }
  };

  const playNextStep = (stepIndex) => {
    if (stepIndex >= DEMO_STEPS.length) {
      setIsDemoPlaying(false);
      setCurrentDemoStep(0);
      return;
    }

    const step = DEMO_STEPS[stepIndex];
    
    const executeStep = () => {
      if (step.type === 'cross') {
        riverCrossingRef.current.moveBoat();
      } else {
        const { character, from, to } = step;
        riverCrossingRef.current.handleDemoMove(character, from, to);
      }
      
      setCurrentDemoStep(stepIndex + 1);
      
      console.log('设置下一步定时器');
      const timeout = setTimeout(() => {
        console.log('执行下一步');
        playNextStep(stepIndex + 1);
      }, 300);
      console.log('新定时器ID:', timeout);
      setDemoTimeout(timeout);
    };

    setTimeout(executeStep, 100);
  };

  const calculateSolution = () => {
    const currentState = gameHistory[currentStep];
    const stateInstance = new State(
      currentState.leftBank,
      currentState.rightBank,
      currentState.boatPosition,
      currentState.boatPassengers
    );

    const solution = findSolution(stateInstance, goalState);
    if (!solution) {
      setHints(['未找到解决方案']);
      return;
    }

    // 格式化状态变化
    const formatStateChange = (current, next) => {
      if (current.boatPosition !== next.boatPosition) {
        const direction = next.boatPosition === 'right' ? ICONS.right : ICONS.left;
        return `${ICONS.boat} ${direction} 划船`;
      }
      
      const currentBoatSet = new Set(current.boatPassengers);
      const nextBoatSet = new Set(next.boatPassengers);
      
      if (nextBoatSet.size > currentBoatSet.size) {
        const boarding = next.boatPassengers.filter(p => !currentBoatSet.has(p));
        return `${boarding.map(getCharacterIcon).join('')} ${ICONS.arrow} ${ICONS.boat}`;
      }
      
      const unboarding = current.boatPassengers.filter(p => !nextBoatSet.has(p));
      return `${unboarding.map(getCharacterIcon).join('')} ${ICONS.arrow} ${current.boatPosition === 'left' ? '🏖️' : '🏝️'}`;
    };

    // 修改提示信息的生成方式
    const newHints = [];
    newHints.push({
      type: 'header',
      content: `${ICONS.boat} 总共需要 ${solution.length - 1} 步`
    });

    for (let i = 0; i < solution.length - 1; i++) {
      const current = solution[i];
      const next = solution[i + 1];
      
      newHints.push({
        type: 'step',
        stepNumber: i + 1,
        content: {
          action: formatStateChange(current, next),
          leftBank: formatBankState(next.leftBank),
          rightBank: formatBankState(next.rightBank),
          boat: formatBankState(next.boatPassengers)
        }
      });
    }
    
    setHints(newHints);
  };

  const toggleSidebar = () => {
    const newIsOpen = !isSidebarOpen;
    setIsSidebarOpen(newIsOpen);
    if (newIsOpen) {
      calculateSolution();
    } else {
      setHints([]);
    }
  };

  useEffect(() => {
    if (isSidebarOpen) {
      calculateSolution();
    }
  }, [currentStep, isSidebarOpen]);

  useEffect(() => {
    const currentState = gameHistory[currentStep];
    const isGameSuccess = 
      currentState.leftBank.length === 0 && 
      currentState.boatPassengers.length === 0 &&
      currentState.rightBank.length === 4 &&
      currentState.boatPosition === 'right';
    
    if (isGameSuccess) {
      setIsSuccess(true);
      // 3秒后自动隐藏成功提示
      setTimeout(() => setIsSuccess(false), 3000);
    }
  }, [currentStep, gameHistory]);

  useEffect(() => {
    return () => {
      if (demoTimeout) {
        clearTimeout(demoTimeout);
      }
    };
  }, [demoTimeout]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>过河游戏</h1>
      </header>
      <main className="main-content">
        <div className="left-panel">
          <RiverCrossing
            ref={riverCrossingRef}
            gameHistory={gameHistory}
            setGameHistory={setGameHistory}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            initialState={initialState}
          />
          <GameControls
            onReset={handleReset}
            onUndo={handleUndo}
            onDemo={handleDemo}
            onToggleHints={toggleSidebar}
            currentStep={currentStep}
            isSidebarOpen={isSidebarOpen}
            isDemoPlaying={isDemoPlaying}
          />
        </div>
        <Hints hints={hints} isSidebarOpen={isSidebarOpen} />
      </main>
      <SuccessModal isSuccess={isSuccess} />
    </div>
  );
}

export default App; 