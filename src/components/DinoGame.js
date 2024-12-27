import React, { useState, useEffect, useCallback } from 'react';

const DinoGame = () => {
  const [dinoPosition, setDinoPosition] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [obstaclePosition, setObstaclePosition] = useState(800);

  // Handle jump mechanics
  const jump = useCallback(() => {
    if (!isJumping && !gameOver) {
      setIsJumping(true);
      let jumpHeight = 0;
      const jumpInterval = setInterval(() => {
        jumpHeight += 10;
        if (jumpHeight <= 100) {
          setDinoPosition(jumpHeight);
        } else {
          clearInterval(jumpInterval);
          const fallInterval = setInterval(() => {
            jumpHeight -= 10;
            if (jumpHeight >= 0) {
              setDinoPosition(jumpHeight);
            } else {
              clearInterval(fallInterval);
              setIsJumping(false);
            }
          }, 30);
        }
      }, 30);
    }
  }, [isJumping, gameOver]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space') {
        jump();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  // Game loop
  useEffect(() => {
    let gameInterval;
    if (!gameOver) {
      gameInterval = setInterval(() => {
        setObstaclePosition((prevPosition) => {
          if (prevPosition <= -20) {
            // Reset obstacle position when it goes off screen
            setScore((prev) => prev + 1);
            return 800;
          }

          // Check for collision
          if (prevPosition > 50 && prevPosition < 90 && dinoPosition < 40) {
            setGameOver(true);
            return prevPosition;
          }

          return prevPosition - 10;
        });
      }, 50);
    }
    return () => clearInterval(gameInterval);
  }, [gameOver, dinoPosition]);

  // Styles
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f0f0',
    },
    game: {
      width: '800px',
      height: '200px',
      border: '1px solid black',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'white',
    },
    dino: {
      width: '50px',
      height: '50px',
      backgroundColor: 'green',
      position: 'absolute',
      bottom: `${dinoPosition}px`,
      left: '50px',
    },
    obstacle: {
      width: '20px',
      height: '40px',
      backgroundColor: 'red',
      position: 'absolute',
      bottom: 0,
      left: `${obstaclePosition}px`,
    },
    score: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      fontWeight: 'bold',
    },
    gameOver: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.game}>
        <div style={styles.dino} />
        <div style={styles.obstacle} />
        <div style={styles.score}>Score: {score}</div>
        {gameOver && (
          <div style={styles.gameOver}>
            <div>Game Over! Score: {score}</div>
            <button onClick={() => window.location.reload()}>Restart</button>
          </div>
        )}
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>Press SPACE to jump</div>
    </div>
  );
};

export default DinoGame;
