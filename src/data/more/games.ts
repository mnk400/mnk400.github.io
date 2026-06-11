import type { MoreItemData } from './types.ts';

export const gameMoreItems: MoreItemData[] = [
  {
    id: 'games/tictactoe',
    title: 'Tic Tac Toe',
    tags: ['game', 'puzzle'],
    redirectFrom: ['/more/tictactoe'],
  },
  {
    id: 'games/gameoflife',
    title: 'Game of Life',
    description: "Conway's Game of Life",
    tags: ['game', 'simulation', 'cellular-automata'],
    redirectFrom: ['/more/gameoflife'],
  },
  {
    id: 'games/colordle',
    title: 'Colordle',
    description: 'Guess the hex color code in 6 tries',
    image: '/assets/images/previews/colordle.jpg',
    tags: ['game', 'color', 'puzzle'],
    redirectFrom: ['/more/colordle'],
  },
  {
    id: 'games/minesweeper',
    title: 'Minesweeper',
    tags: ['game', 'puzzle'],
    redirectFrom: ['/more/minesweeper'],
  },
  {
    id: 'games/flappybird',
    title: 'Flappy Bird',
    description: 'A minimal flappy-bird clone.',
    image: '/assets/images/previews/flappy.jpg',
    tags: ['game', 'arcade', 'canvas'],
    redirectFrom: ['/more/flappybird'],
  },
];
