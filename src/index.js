import React from 'react';
import ReactDOM from 'react-dom';
import {shiftBoard, updateMirror, boardDiff} from './boardUtils.js'
import {deepCopyArr} from './util.js'
import {Midi} from './midi.js'
import './index.css';

var classNames = require('classnames');

class Square extends React.Component {
  render() {
    var classes = classNames({
      square: true,
      lit: this.props.lit,
      selecting: this.props.selecting
    })
    return (
      <div 
        onClick={this.props.onClick}
        className={classes}></div>
    );
  }
}

class Board extends React.Component {
  render() {
    let rows = [];
    for (var i = 0; i < 8; i++) {
      let cols = [];
      for (var j = 0; j < 8; j++) {((i, j) => {
        var that = this;
        cols.push(<Square 
          selecting={this.props.selecting}
          key={i + ',' + j}
          lit={this.props.boardLights[i][j]} 
          onClick={() => that.props.onBoardClick(i, j)} />);
        })(i, j)
      }
      rows.push(cols);
    }

    return rows;
  }
}


class Metronome extends React.Component {
  render() {
    return <h1>{'*'.repeat(this.props.beatPos % 4 + 1)}</h1>
  }
}

class Fakepad extends React.Component {
  constructor() {
    super();
    this.state = {
      selecting: false,
      fakeClock: true,
      beatPos: 0,
      boardLights: Array(8).fill(Array(8).fill(false)),
      animationFrame: -1,
      activeAnimation: null,
      activeAnimationFrame: -1,
      mirrorX: true,
      mirrorY: true,
      grow: false,
      currentSquare: null,
      animations: [], //index => [array of board states]
      animationNames: {} //name => index
    }
    this.localStorageKey = this.constructor.name;
    console.log(this.localStorageKey);
    var storedState = localStorage.getItem(this.localStorageKey);
    if (storedState) this.state = JSON.parse(storedState);

    this.midi = new Midi(this.state.fakeClock);
    this.midi.onEvery(24, (songPos) => this.setState({beatPos: songPos / 24}));
    this.midi.onEvery(6, (songPos) => this.handleNextFrame());

    this.handleBoardClick = this.handleBoardClick.bind(this);

    window.midi = this.midi;
  }
  //Board handling methods
  clearBoard() {
    this.setState({boardLights: Array(8).fill(Array(8).fill(false))});
  }
  handleBoardClick(i, j) {
    var boardLights = deepCopyArr(this.state.boardLights);
    boardLights[i][j] = !boardLights[i][j];
    if (this.state.mirrorX) boardLights[i][7 - j] = !boardLights[i][7 - j];
    if (this.state.mirrorY) boardLights[7 - i][j] = !boardLights[7 - i][j];
    if (this.state.mirrorX && this.state.mirrorY)
        boardLights[7 - i][7 - j] = !boardLights[7 - i][7 - j];

    this.setState({boardLights: boardLights});
  }
  shiftBoard(direction) {
    const boardLights = shiftBoard(this.state.boardLights, direction, this.state.mirrorX, this.state.mirrorY);
    this.setState({boardLights: boardLights});
  }

  //Animation handling methods
  previewAnimation(animation, reverse) {
    if (reverse) animation = deepCopyArr(animation).reverse();
    this.setState({activeAnimation: animation, activeAnimationFrame: 0, boardLights: animation[0]}, this.handleNextFrame);
  }

  handleNextFrame() {
    if (this.state.activeAnimation) {
      if (this.state.activeAnimationFrame >= this.state.activeAnimation.length - 1) {
        this.setState({
          activeAnimation: null, 
          activeAnimationFrame: -1,
          boardLights: Array(8).fill(Array(8).fill(false))
        });
      } else {
        const nextFrame = this.state.activeAnimationFrame + 1;
        this.setState({
          activeAnimationFrame: nextFrame,
          boardLights: this.state.activeAnimation[nextFrame]});
      }
    } else {
      var boardLights = deepCopyArr(Array(8).fill(Array(8).fill(false)));
      var beatPos = this.state.beatPos % 16;
      const x = Math.floor(beatPos / 4);
      const y = beatPos % 4;
      boardLights[x][y] = true;
      updateMirror(boardLights, this.state.mirrorX, this.state.mirrorY);
      this.setState({
        boardLights: boardLights
      })
    }
  }

  randomAnimation(trail, consecutive, steps) {
    var animation = deepCopyArr(Array(steps).fill(Array(8).fill(Array(8).fill(false))));
    var randomCell = () => Math.floor(Math.random() * 8);
    var pickOne = (x, y) => (Math.random() > 0.5) ? x : y;
    var point = [randomCell(), randomCell()];
    var pointHash = (point) => point[0] * 8 + point[1];
    var pointHashes = new Set();

    for (var i = 0; i < steps; i++) {
      if (trail && i > 0) animation[i] = deepCopyArr(animation[i - 1]);
      animation[i][point[0]][point[1]] = true;
      pointHashes.add(pointHash(point));
      var newPoint = point.slice();
      while (pointHashes.has(pointHash(newPoint))) {
        if (consecutive) {
          var index = pickOne(0, 1);
          newPoint[index] += (newPoint[index] === 0) ? 1 : (newPoint[index] === 7) ? -1 : pickOne(1, -1);
        } else {
          newPoint = [randomCell(), randomCell()];
        }
      }
      point = newPoint;
    }
    this.previewAnimation(animation);
  }

  getAnimationByName(animationName) {
    return this.state.animations[this.state.animationNames[animationName]];
  }
  
  // Key Bindings

  handleKeyDown(event) {
    if (event.keyCode === 80 && this.state.animations.length > 0) {
      this.previewAnimation(
        this.state.animations[this.state.animations.length - 1]);
    }
  }

  handleKeyUp(event) {
    console.log(event.keyCode);
    if (event.keyCode === 88) this.setState({mirrorX: !this.state.mirrorX});
    if (event.keyCode === 89) this.setState({mirrorY: !this.state.mirrorY});
    if (event.keyCode === 67) this.clearBoard();
    if (event.keyCode === 65) {
      var animationFrame = this.state.animationFrame;
      var animations = deepCopyArr(this.state.animations);
      if (animationFrame === -1) {
        animations.push([]);
        animationFrame = 0;
        this.clearBoard();
      } else { //Store current frame and advance to next frame
        var currentAnimation = animations[animations.length - 1];
        currentAnimation.push(this.state.boardLights);
        animationFrame += 1;
      }
      this.setState({animationFrame: animationFrame, animations: animations});
    }
    if (this.state.animationFrame > -1 && event.keyCode === 13) {
      var saveName = window.prompt("Name this animation");
      var animationNames = this.state.animationNames;
      if (saveName) animationNames[saveName] = this.state.animations.length - 1;
      this.setState({
        animationNames: animationNames,
        animationFrame: -1
      });
      this.clearBoard();
    }

    if (event.keyCode === 38) this.shiftBoard('up');
    if (event.keyCode === 40) this.shiftBoard('down');
    if (event.keyCode === 37) this.shiftBoard('left');
    if (event.keyCode === 39) this.shiftBoard('right');
  }

  handleSelect(i, j) {
    this.setState({selecting: false, currentSquare: [i, j]});
  }

  componentWillMount() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this), false);
    document.addEventListener('keyup', this.handleKeyUp.bind(this), false);
    this.handleSelect = this.handleSelect.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    const stateString = JSON.stringify(this.state);
    if (JSON.stringify(prevState) !== stateString) {
      localStorage.setItem(this.localStorageKey, stateString);
    }

    if (JSON.stringify(prevState.boardLights) 
        !== JSON.stringify(this.state.boardLights)) {
      const diff = boardDiff(prevState.boardLights, this.state.boardLights);
      this.midi.lightOn(diff.on);
      this.midi.lightOff(diff.off);
    }
  }

  render() {
    return (
      <div>
      <div className="board">
        <Board ref="board" 
          mirrorX={this.state.mirrorX} mirrorY={this.state.mirrorY}
          grow={this.state.grow} boardLights={this.state.boardLights}
          onBoardClick={this.handleBoardClick}
          selecting={this.state.selecting} onSelect={this.handleSelect}/>
      </div>
      <div className="info">
        <h3>Info</h3>
        <p>mirrorX: {this.state.mirrorX ? 'on' : 'off'}</p>
        <p>mirrorY: {this.state.mirrorY ? 'on' : 'off'}</p>
        <button onClick={()=> {
          this.setState({fakeClock: !this.state.fakeClock})}
        }>
          fakeClock: {this.state.fakeClock ? 'on' : 'off'}
        </button>
        <p>{(this.state.animationFrame > -1) ? ('Draw frame: ' + this.state.animationFrame) : ''}</p>
        <p>{this.state.selecting ? 'Pick a square' : ''}</p>
        <p>{this.state.currentSquare ? 
          'animating: ' + (this.state.currentSquare[0] + ',' + this.state.currentSquare[1]) 
          : ''}</p>
        <button onClick={() => this.midi.onNext(24, 
            () => this.randomAnimation(
              false, false, 4))}>
          Random
        </button>
        <button onClick={() => this.midi.onNext(24, 
            () => this.randomAnimation(
              true, true, 4))}>
          Snake
        </button>
        <ul>
          {Object.keys(this.state.animationNames).map((animationName) => 
            <li className='pointer' key={animationName}>
              <a onClick={() => {
                  this.previewAnimation(this.getAnimationByName(animationName), false)}}>
                {animationName}
              </a>
              <a onClick={() => {
                  this.previewAnimation(this.getAnimationByName(animationName), true)}}>
                &nbsp;&nbsp;[rev]
              </a>
            </li>)}
        </ul>
        <Metronome beatPos={this.state.beatPos} />
      </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Fakepad />,
  document.getElementById('root')
);

