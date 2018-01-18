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
  updateMirror(newBoard, mirrorX, mirrorY);
  return newBoard;
}

export function updateMirror(board, mirrorX, mirrorY) {
  var i, j;
  if (mirrorY) 
    for (i = 0; i < 4; i++)
      board[7 - i] = board[i];
  if (mirrorX)
      for (i = 0; i < 8; i++)
        for (j = 0; j < 4; j++)
          board[i][7 - j] = board[i][j];
}

function onLights(board) {
  var out = [];
  for (var i = 0; i < board.length; i++) {
    for (var j = 0; j < board[i].length; j++) {
      if (board[i][j]) out.push([i, j]);
    }
  }
  return out;
}

function coordDiff(coords1, coords2) {
  const oldCoords = new Set(coords1.map(JSON.stringify));
  const newCoords = new Set(coords2.map(JSON.stringify));
  return {
    off: [...oldCoords].filter(c => !newCoords.has(c)).map(JSON.parse),
    on: [...newCoords].filter(c => !oldCoords.has(c)).map(JSON.parse)
  } 
}

export function boardDiff(board1, board2) {
  return coordDiff(onLights(board1), onLights(board2));
}