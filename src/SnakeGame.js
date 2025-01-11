import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const GRID_SIZE = 20;
const CELL_SIZE = 25;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;
const QUESTION_TIME_LIMIT = 10;
const REVIVAL_DISTANCE = 5;

// Add this helper function to calculate safe revival position
const calculateRevivalPosition = (deathPosition, direction) => {
  let newX = deathPosition.x;
  let newY = deathPosition.y;
  
  // Calculate new position based on death direction
  switch (direction) {
    case 'UP':
      newY = Math.min(deathPosition.y + REVIVAL_DISTANCE, GRID_SIZE - 3);
      break;
    case 'DOWN':
      newY = Math.max(deathPosition.y - REVIVAL_DISTANCE, 2);
      break;
    case 'LEFT':
      newX = Math.min(deathPosition.x + REVIVAL_DISTANCE, GRID_SIZE - 3);
      break;
    case 'RIGHT':
      newX = Math.max(deathPosition.x - REVIVAL_DISTANCE, 2);
      break;
    default:
      break;
  }

  // Ensure position is within bounds
  newX = Math.max(2, Math.min(newX, GRID_SIZE - 3));
  newY = Math.max(2, Math.min(newY, GRID_SIZE - 3));

  return { x: newX, y: newY };
};
const generateMathQuestion = () => {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  let num1, num2, answer;

  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50);
      num2 = Math.floor(Math.random() * 50);
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 50) + 50;
      num2 = Math.floor(Math.random() * num1);
      answer = num1 - num2;
      break;
    case '*':
      num1 = Math.floor(Math.random() * 12);
      num2 = Math.floor(Math.random() * 12);
      answer = num1 * num2;
      break;
    default:
      break;
  }

  return {
    question: `${num1} ${operation} ${num2} = ?`,
    answer: answer
  };
};

const SnakeGame = () => {
  const [snake, setSnake] = useState([
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [mathQuestion, setMathQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [reviveAttempts, setReviveAttempts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [timerActive, setTimerActive] = useState(false);
  const [revivalMethod, setRevivalMethod] = useState(null);
  const [detector, setDetector] = useState(null);
  const [facePosition, setFacePosition] = useState(null);
  const [movementComplete, setMovementComplete] = useState(false);
  const [movementStage, setMovementStage] = useState('start');
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [deathPosition, setDeathPosition] = useState(null);
  const [deathDirection, setDeathDirection] = useState(null);
  const [deathLength, setDeathLength] = useState(null); // Add this state
  const [deathSnake, setDeathSnake] = useState(null);  // Add this state

  // Initialize face detection
  useEffect(() => {
    const initializeDetector = async () => {
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detector = await faceDetection.createDetector(model, {
        runtime: 'tfjs',
      });
      setDetector(detector);
    };
    initializeDetector();
  }, []);

  // Generate random food position
  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      return generateFood();
    }
    return newFood;
  }, [snake]);

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };

        switch (direction) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
          default: break;
        }

        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          setDeathPosition(newSnake[0]); // Store death position
          setDeathDirection(direction);   // Store death direction
          setDeathLength(newSnake.length);
          setDeathSnake(newSnake);
          return prevSnake;
        }

        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
            setGameOver(true);
            setDeathPosition(newSnake[0]);
            setDeathDirection(direction);
            setDeathLength(newSnake.length);
            setDeathSnake(newSnake);
          return prevSnake;
        }

        newSnake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
          setFood(generateFood());
          setScore(prev => prev + 10);
          setSpeed(prev => Math.max(prev - SPEED_INCREASE, 50));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const gameInterval = setInterval(moveSnake, speed);
    return () => clearInterval(gameInterval);
  }, [direction, food, gameOver, generateFood, speed]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (gameOver) return;
      
      switch (event.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
        default: break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [direction, gameOver]);

  // Math question timer
  useEffect(() => {
    if (!mathQuestion || !timerActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setTimerActive(false);
          setReviveAttempts(prev => prev - 1);
          if (reviveAttempts <= 1) {
            resetGame();
          } else {
            setMathQuestion(generateMathQuestion());
            setUserAnswer('');
            return QUESTION_TIME_LIMIT;
          }
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mathQuestion, timerActive, reviveAttempts]);

  // Face detection functions
  const startFaceDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: 640,
          height: 480,
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setVideoLoaded(true);
        };
      }

      const detectFaces = async () => {
        if (!detector || !videoRef.current || !streamRef.current || !videoLoaded) return;

        try {
          const video = videoRef.current;
          
          if (video.readyState === video.HAVE_ENOUGH_DATA &&
              video.videoWidth !== 0 && 
              video.videoHeight !== 0) {
            
            const faces = await detector.estimateFaces(video);
            
            if (faces.length > 0) {
              const face = faces[0];
              const x = (face.box.xMin + face.box.xMax) / 2;
              setFacePosition(x);

              if (x < video.videoWidth * 0.3) {
                setMovementStage('start');
              } else if (x > video.videoWidth * 0.7) {
                if (movementStage === 'start') {
                  setMovementComplete(true);
                  stopFaceDetection();
                  handleSuccessfulMovement();
                  return;
                }
              }
            }

            if (!movementComplete) {
              requestAnimationFrame(detectFaces);
            }
          } else {
            requestAnimationFrame(detectFaces);
          }
        } catch (error) {
          console.error('Face detection error:', error);
          requestAnimationFrame(detectFaces);
        }
      };

      if (videoLoaded) {
        detectFaces();
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };
  const stopFaceDetection = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoLoaded(false);
  };
  const reconstructSnake = (revivalPos, originalSnake) => {
    const newSnake = [];
    const length = originalSnake.length;
    
    // Add the new head at revival position
    newSnake.push({ x: revivalPos.x, y: revivalPos.y });
    
    // Reconstruct the snake body based on the revival direction
    for (let i = 1; i < length; i++) {
      const prevSegment = newSnake[i - 1];
      let newSegment;
      
      switch (deathDirection) {
        case 'RIGHT':
          newSegment = { x: prevSegment.x - 1, y: prevSegment.y };
          break;
        case 'LEFT':
          newSegment = { x: prevSegment.x + 1, y: prevSegment.y };
          break;
        case 'DOWN':
          newSegment = { x: prevSegment.x, y: prevSegment.y - 1 };
          break;
        case 'UP':
          newSegment = { x: prevSegment.x, y: prevSegment.y + 1 };
          break;
        default:
          newSegment = { x: prevSegment.x - 1, y: prevSegment.y };
      }
      newSnake.push(newSegment);
    }
    
    return newSnake;
  };
  const handleSuccessfulMovement = () => {
    setGameOver(false);
    setRevivalMethod(null);
    setMovementComplete(false);
    setMovementStage('start');
    setSnake(prev => {
      const safeX = Math.min(Math.max(prev[0].x, 1), GRID_SIZE - 2);
      const safeY = Math.min(Math.max(prev[0].y, 1), GRID_SIZE - 2);
      return [
        { x: safeX, y: safeY },
        { x: safeX - 1, y: safeY },
        { x: safeX - 2, y: safeY }
      ];
    });
    setDirection('RIGHT');
  };
  
  // Update handleAnswerSubmit
  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    setTimerActive(false);
    
    if (parseInt(userAnswer) === mathQuestion.answer) {
      const revivalPos = calculateRevivalPosition(deathPosition, deathDirection);
      const revivedSnake = reconstructSnake(revivalPos, deathSnake);
      
      setGameOver(false);
      setMathQuestion(null);
      setUserAnswer('');
      setTimeLeft(QUESTION_TIME_LIMIT);
      setRevivalMethod(null);
      setSnake(revivedSnake);
      setDirection(deathDirection);
      // Score is maintained since we never changed it
    } else {
      setReviveAttempts(prev => prev - 1);
      if (reviveAttempts <= 1) {
        resetGame();
      } else {
        setMathQuestion(generateMathQuestion());
        setUserAnswer('');
        setTimeLeft(QUESTION_TIME_LIMIT);
        setTimerActive(true);
      }
    }
  };

  const resetGame = () => {
    setSnake([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    setFood(generateFood());
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setMathQuestion(null);
    setUserAnswer('');
    setReviveAttempts(3);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setTimerActive(false);
    setRevivalMethod(null);
    setMovementComplete(false);
    setMovementStage('start');
    stopFaceDetection();
    setDeathPosition(null);
    setDeathDirection(null);
    setDeathLength(null);
    setDeathSnake(null);
    stopFaceDetection();
  };
  const RevivalIndicator = () => {
    if (!gameOver || !deathPosition) return null;

    const revivalPos = calculateRevivalPosition(deathPosition, deathDirection);
    
    return (
      <div
        style={{
          position: 'absolute',
          left: `${revivalPos.x * CELL_SIZE + parseInt(styles.gameBoard.padding)}px`,
          top: `${revivalPos.y * CELL_SIZE + parseInt(styles.gameBoard.padding)}px`,
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.3)',
          border: '2px dashed #fff',
          animation: 'pulse 1.5s infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    );
  };

    // Add this CSS animation to your styles
    const keyframes = `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(1); opacity: 0.6; }
    }
  `;

  // Add the style tag to the component
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = keyframes;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  useEffect(() => {
    return () => {
      stopFaceDetection();
    };
  }, []);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '90vh',
      
      padding: '20px',
      overflowY: 'hidden',
    },
    gameBoard: {
      display: 'grid',
      gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
      gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
      gap: '1px',
      background: 'rgba(255, 255, 255, 0.1)',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      border: '2px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '10px',
      padding: '10px',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
    },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: '4px',
      transition: 'background-color 0.1s ease',
    },
    snakeCell: {
      background: 'linear-gradient(45deg, #00f260 0%, #0575e6 100%)',
      borderRadius: '40px',
      boxShadow: '0 0 5px rgba(0, 242, 96, 0.5)',
    },
    foodCell: {
      background: 'linear-gradient(45deg, #ff416c 0%, #ff4b2b 100%)',
      borderRadius: '50%',
      boxShadow: '0 0 5px rgba(255, 65, 108, 0.5)',
    },
    score: {
      color: 'white',
      fontSize: '24px',
      marginBottom: '3px',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    },
    revivalChoice: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      padding: '30px',
      borderRadius: '15px',
      color: 'white',
      textAlign: 'center',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
    },
    mathQuestion: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      padding: '30px',
      borderRadius: '15px',
      color: 'white',
      textAlign: 'center',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      minWidth: '300px',
    },
    videoContainer: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      padding: '20px',
      borderRadius: '15px',
      textAlign: 'center',
      width: '660px',
      maxWidth: '95vw',
      color:'white'
    },
    video: {
      width: '640px',
      height: '480px',
      maxWidth: '100%',
      maxHeight: 'calc(100vh - 200px)',
      borderRadius: '10px',
      objectFit: 'cover',
    },
    input: {
      margin: '10px 0',
      padding: '8px',
      fontSize: '18px',
      borderRadius: '5px',
      border: '2px solid #0575e6',
      width: '100px',
      textAlign: 'center',
    },
    button: {
      padding: '10px 20px',
      fontSize: '16px',
      background: 'linear-gradient(45deg, #00f260 0%, #0575e6 100%)',
      border: 'none',
      borderRadius: '5px',
      color: 'white',
      cursor: 'pointer',
      transition: 'transform 0.1s ease',
      marginTop: '10px',
    },
    choiceButton: {
      padding: '15px 30px',
      margin: '10px',
      fontSize: '16px',
      background: 'linear-gradient(45deg, #00f260 0%, #0575e6 100%)',
      border: 'none',
      borderRadius: '5px',
      color: 'white',
      cursor: 'pointer',
      transition: 'transform 0.1s ease',
    },
    movementIndicator: {
      width: '100%',
      height: '10px',
      background: '#444',
      borderRadius: '5px',
      marginTop: '10px',
      position: 'relative',
    },
    movementProgress: {
      height: '100%',
      background: 'linear-gradient(90deg, #00f260, #0575e6)',
      borderRadius: '5px',
      transition: 'width 0.3s ease',
      width: videoLoaded && facePosition ? 
        `${(facePosition / videoRef.current?.videoWidth) * 100}%` : '0%',
    },
    timerContainer: {
      marginTop: '15px',
      width: '100%',
    },
    timerBar: {
      width: '100%',
      height: '8px',
      background: '#444',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    timerProgress: {
      height: '100%',
      background: `linear-gradient(90deg, 
        ${timeLeft <= 3 ? '#ff416c' : '#00f260'} 0%, 
        ${timeLeft <= 3 ? '#ff4b2b' : '#0575e6'} 100%)`,
      width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%`,
      transition: 'width 1s linear, background 0.5s ease',
    },
    timerText: {
      color: 'white',
      fontSize: '14px',
      textAlign: 'center',
      marginBottom: '5px',
    },
    restartButton: {
        padding: '10px 20px',
        fontSize: '16px',
        background: 'linear-gradient(45deg, #ff416c 0%, #ff4b2b 100%)',
        border: 'none',
        borderRadius: '5px',
        color: 'white',
        cursor: 'pointer',
        marginBottom:'5px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
        },
        '&:active': {
          transform: 'translateY(1px)',
        },
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.score}>Score: {score}</div>
      <button 
        style={styles.restartButton}
        onClick={() => {
          if (window.confirm('Are you sure you want to restart the game?')) {
            stopFaceDetection(); // Stop face detection if active
            resetGame();
          }
        }}
      >
        Restart Game
      </button>
      <div style={styles.gameBoard}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const isSnake = snake.some(segment => segment.x === x && segment.y === y);
          const isFood = food.x === x && food.y === y;

          return (
            <div
              key={index}
              style={{
                ...styles.cell,
                ...(isSnake && styles.snakeCell),
                ...(isFood && styles.foodCell),
              }}
            />
          );
        })}
      </div>

      {gameOver && !revivalMethod && (
        <div style={styles.revivalChoice}>
          <h3>Choose Your Revival Method</h3>
          <button 
            style={styles.choiceButton}
            onClick={() => {
              setRevivalMethod('math');
              setMathQuestion(generateMathQuestion());
              setTimerActive(true);
            }}
          >
            Solve Math Question
          </button>
          <button 
            style={styles.choiceButton}
            onClick={() => {
              setRevivalMethod('movement');
              startFaceDetection();
            }}
          >
            Face Movement Challenge
          </button>
        </div>
      )}

      {revivalMethod === 'math' && mathQuestion && (
        <div style={styles.mathQuestion}>
          <h3>Solve to Continue!</h3>
          <div style={styles.timerContainer}>
            <div style={styles.timerText}>
              Time Remaining: {timeLeft}s
            </div>
            <div style={styles.timerBar}>
              <div style={styles.timerProgress} />
            </div>
          </div>
          <p style={{ fontSize: '24px', margin: '20px 0' }}>
            {mathQuestion.question}
          </p>
          <form onSubmit={handleAnswerSubmit}>
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <br />
            <button type="submit" style={styles.button}>
              Submit
            </button>
          </form>
          <p style={{ color: '#ff416c', marginTop: '10px' }}>
            Remaining attempts: {reviveAttempts}
          </p>
        </div>
      )}

      {revivalMethod === 'movement' && (
        <div style={styles.videoContainer}>
          <h3>Move your face from left to right</h3>
          <video 
            ref={videoRef}
            style={styles.video}
            autoPlay
            playsInline
            width="640"
            height="480"
            onLoadedData={() => setVideoLoaded(true)}
          />
          <div style={styles.movementIndicator}>
            <div style={styles.movementProgress} />
          </div>
          <p>Progress: {movementStage}</p>
        </div>
      )}
    </div>
  );
};

export default SnakeGame;