import {deepCopyArr} from './util.js'

export function shiftBoard(board, direction, mirrorX, mirrorY) {
  var newBoard = deepCopyArr(board);
  var inc, i, j;
  if (direction === 'down' || direction === 'up') { 
    var down = (direction === 'down');
    var prevRow = Array(8).fill(false);
    inc = down ? 1 : -1;
    for (i = 4; i < 8; i++) newBoard[i] = Array(8).fill(false);
    for (i = (down ? 0 : 7); down ? (i < 8) : (i > -1); i+=inc) {
      var currentRow = newBoard[i];
      newBoard[i] = prevRow;
      prevRow = currentRow;
    }
  } else {
    var right = (direction === 'right');
    inc = right ? 1 : -1;
    for (i = 0; i < 8; i++)
      for (j = 4; j < 8; j++)
        newBoard[i][j] = false;
    for (i = 0; i < 8; i++) {
      var prevVal = false;
      for (j = (right ? 0 : 7); right ? (j < 8) : (j > -1); j+=inc) {
        var currentVal = newBoard[i][j];
        newBoard[i][j] = prevVal;
        prevVal = currentVal;
      }
    }
  }

  if (mirrorY) 
    for (i = 0; i < 4; i++)
      newBoard[7 - i] = newBoard[i];
  if (mirrorX)
      for (i = 0; i < 8; i++)
        for (j = 0; j < 4; j++)
          newBoard[i][7 - j] = newBoard[i][j];

  return newBoard;
}