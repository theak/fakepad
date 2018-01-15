import React from 'react';
import ReactDOM from 'react-dom';
import {deepCopyArr} from './util.js'
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
  constructor() {
    super();
    this.state = {
      lit: Array(8).fill(Array(8).fill(false))
    }
    this.shift = this.shift.bind(this);
  }

  clear() {
    this.setState({lit: Array(8).fill(Array(8).fill(false))});
  }

  shift(direction) {
    var newState = deepCopyArr(this.state.lit);
    var inc, i, j;
    if (direction === 'down' || direction === 'up') { 
      var down = (direction === 'down');
      var prevRow = Array(8).fill(false);
      inc = down ? 1 : -1;
      if (!this.props.grow)
        for (i = 4; i < 8; i++)
          newState[i] = Array(8).fill(false);
      for (i = (down ? 0 : 7); down ? (i < 8) : (i > -1); i+=inc) {
        var currentRow = newState[i];
        newState[i] = prevRow;
        prevRow = currentRow;
      }
    } else {
      var right = (direction === 'right');
      inc = right ? 1 : -1;
      if (!this.props.grow)
        for (i = 0; i < 8; i++)
          for (j = 4; j < 8; j++)
            newState[i][j] = false;
      for (i = 0; i < 8; i++) {
        var prevVal = false;
        for (j = (right ? 0 : 7); right ? (j < 8) : (j > -1); j+=inc) {
          var currentVal = newState[i][j];
          newState[i][j] = prevVal;
          prevVal = currentVal;
        }
      }
    }

    this.updateMirror({lit: newState});
  }

  updateMirror(newState) {
    var i, j;
    if (this.props.mirrorY) {
      for (i = 0; i < 4; i++) {
        newState.lit[7 - i] = newState.lit[i];
      }
    }
    if (this.props.mirrorX) {
      for (i = 0; i < 8; i++) {
        for (j = 0; j < 4; j++)
          newState.lit[i][7 - j] = newState.lit[i][j];
      }
    }
    this.setState(newState)
  }
  
  render() {
    let rows = [];
    for (var i = 0; i < 8; i++) {
      let cols = [];
      for (var j = 0; j < 8; j++) {
        ((i, j) => {
          var newState = {lit: deepCopyArr(this.state.lit)};
          newState.lit[i][j] = !newState.lit[i][j];
          if (this.props.mirrorX) newState.lit[i][7 - j] = !newState.lit[i][7 - j];
          if (this.props.mirrorY) newState.lit[7 - i][j] = !newState.lit[7 - i][j];
          if (this.props.mirrorX && this.props.mirrorY) 
            newState.lit[7 - i][7 - j] = !newState.lit[7 - i][7 - j];
        cols.push(<Square 
          selecting={this.props.selecting}
          key={i + ',' + j}
          lit={this.state.lit[i][j]} 
          onClick={this.props.selecting ? (() => this.props.onSelect(i, j))
            : (() => this.setState(newState))} />);
        })(i, j)
      }
      rows.push(cols);
    }

    return rows;
  }
}


class Game extends React.Component {
  constructor() {
    super();
    this.state = {
      selecting: false,
      animationFrame: -1,
      animating: false,
      mirrorX: true,
      mirrorY: true,
      grow: false,
      currentSquare: null,
      animations: [], //index => [array of board states]
      animationNames: {} //name => index
    }
    this.localStorageKey = this.constructor.name;
    var storedState = localStorage.getItem(this.localStorageKey);
    if (storedState) this.state = JSON.parse(storedState);
  }
  handleKeyDown(event) {
    if (event.keyCode === 80 && this.state.animations.length > 0) {
      this.previewAnimation(
        this.state.animations[this.state.animations.length - 1], 300,
        false);
    }
  }

  previewAnimation(animation, duration, reverse, keep) {
    this.setState({animating: true});
    var index = reverse ? (animation.length - 1) : 0;
    var stepDuration = duration / animation.length;
    this.refs.board.setState({lit: animation[index]});
    if (animation.length > 1) {
      var remainder = reverse ? animation.slice(0, index) : animation.slice(1);
      setTimeout(() => this.previewAnimation(remainder, 
        duration - stepDuration, reverse), stepDuration);
    } else {
      setTimeout(() => {
        if (!keep) this.refs.board.clear();
        this.setState({animating: false});
      }, stepDuration);
    }
  }

  randomAnimation(trail, consecutive, steps, duration) {
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
    console.log(animation);
    this.previewAnimation(animation, duration);
  }

  handleKeyUp(event) {
    console.log(event.keyCode);
    if (event.keyCode === 88) this.setState({mirrorX: !this.state.mirrorX});
    if (event.keyCode === 89) this.setState({mirrorY: !this.state.mirrorY});
    if (event.keyCode === 67) this.refs.board.clear();
    if (event.keyCode === 65) {
      var animationFrame = this.state.animationFrame;
      var animations = deepCopyArr(this.state.animations);
      if (animationFrame === -1) {
        animations.push([]);
        animationFrame = 0;
        this.refs.board.clear();
      } else { //Store current frame and advance to next frame
        var currentAnimation = animations[animations.length - 1];
        currentAnimation.push(this.refs.board.state.lit);
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
      this.refs.board.clear();
    }

    if (event.keyCode === 38) this.refs.board.shift('up');
    if (event.keyCode === 40) this.refs.board.shift('down');
    if (event.keyCode === 37) this.refs.board.shift('left');
    if (event.keyCode === 39) this.refs.board.shift('right');
  }

  handleSelect(i, j) {
    this.setState({selecting: false, currentSquare: [i, j]});
  }

  componentWillMount() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this), false);
    document.addEventListener('keyup', this.handleKeyUp.bind(this), false);
    this.handleSelect = this.handleSelect.bind(this);
  }

  componentDidUpdate() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => 
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.state)), 500)
  }

  render() {
    return (
      <div>
      <div className="board">
        <Board ref="board" 
          mirrorX={this.state.mirrorX} mirrorY={this.state.mirrorY}
          grow={this.state.grow}
          selecting={this.state.selecting} onSelect={this.handleSelect}/>
      </div>
      <div className="info">
        <h3>Info</h3>
        <p>mirrorX: {this.state.mirrorX ? 'on' : 'off'}</p>
        <p>mirrorY: {this.state.mirrorY ? 'on' : 'off'}</p>
        <p>grow: {this.state.grow ? 'on' : 'off'}</p>
        <p>{(this.state.animationFrame > -1) ? ('Draw frame: ' + this.state.animationFrame) : ''}</p>
        <p>{this.state.selecting ? 'Pick a square' : ''}</p>
        <p>{this.state.currentSquare ? 
          'animating: ' + (this.state.currentSquare[0] + ',' + this.state.currentSquare[1]) 
          : ''}</p>
        <h4>{this.state.animationNames.length ? 'Animations' : ''}</h4>
        <ul>
          {Object.keys(this.state.animationNames).map((animationName) => 
            <li className='pointer' key={animationName}
                onClick={() => {
                this.previewAnimation(
                this.state.animations[this.state.animationNames[animationName]], 300, false)}}>
              {animationName}</li>)}
        </ul>
        <div className='pointer' onClick={() => this.randomAnimation(false, false, 6, 300)}>Random</div>
      </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);

