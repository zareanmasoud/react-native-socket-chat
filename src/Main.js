import React from 'react';
import {AsyncStorage, Platform} from 'react-native';
import SocketIOClient from 'socket.io-client';
import {GiftedChat} from 'react-native-gifted-chat';

const USER_ID = '@userId';

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      userId: null
    };

    this.socket = SocketIOClient(`http://${Platform.OS === 'ios' ? 'localhost' : '10.0.2.2'}:3000`);
    this.socket.on('message', this.onReceivedMessage);
    this.determineUser();
  }

  render() {
    const user = {_id: this.state.userId || -1};

    return (
      <GiftedChat
        messages={this.state.messages}
        onSend={this.onSend}
        user={user}
      />
    );
  }

  determineUser = () => {
    AsyncStorage.getItem(USER_ID)
      .then((userId) => {
        if (!userId) {
          this.socket.emit('userJoined', null);
          this.socket.on('userJoined', (userId) => {
            AsyncStorage.setItem(USER_ID, userId);
            this.setState({userId});
          });
        } else {
          this.socket.emit('userJoined', userId);
          this.setState({userId});
        }
      })
      .catch((e) => alert(e));
  };

  onReceivedMessage = (messages) => {
    this._storeMessages(messages);
  };

  onSend = (messages = []) => {
    this.socket.emit('message', messages[0]);
    this._storeMessages(messages);
  };

  _storeMessages = (messages) => {
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, messages),
      };
    });
  };
}

module.exports = Main;

