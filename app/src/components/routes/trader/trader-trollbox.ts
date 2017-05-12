/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
@Component({
  selector: 'traderTrollbox',
  styles: [`
    trader-trollbox .trader-component-title {
      height: 45px;
      padding-bottom: 8px;
    }
    trader-trollbox textarea {
      width: 100%;
      padding: 4px;
      margin: 8px;
    }
    trader-trollbox .bottom-control {
      min-height: 60px !important;
    }
    trader-trollbox .bottom-control .join-area input {
      width: 100%;
      text-align: initial;
    }
    trader-trollbox ul {
      padding-left: 8px;
    }
    /* These styles are taken from the demo on https://github.com/Luegg/angularjs-scroll-glue */
    trader-trollbox [scroll-glue-top],
    trader-trollbox [scroll-glue-bottom],
    trader-trollbox [scroll-glue]{
      height: 400px;
      overflow-y: scroll;
      border: 1px solid gray;
    }
    trader-trollbox [scroll-glue-left],
    trader-trollbox [scroll-glue-right]{
      width: 100px;
      overflow-x: scroll;
      border: 1px solid gray;
      padding: 10px;
    }
    trader-trollbox [scroll-glue-left] span,
    trader-trollbox [scroll-glue-right] span{
      border: 1px solid black;
    }
  `],
  template: `
    <div layout="column" layout-fill>
      <div layout="row" class="trader-component-title">Trollbox&nbsp;
        <span flex></span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <div scroll-glue>
        <ul>
          <li ng-repeat="item in vm.messages">
            <span><b>{{item.username}}</b>: {{item.text}}</span>
          </li>
        </ul>
      </div>
      <div layout="row" class="bottom-control">
        <div layout="column" flex ng-if="vm.trollbox.name" class="chat-area">
          <textarea rows="2" placeholder="Troll" ng-keypress="vm.onTextAreaKeyPress($event)"
            placeholder="Hit ENTER key to send, SHIFT+ENTER for new line" ng-model="vm.messageText"></textarea>
        </div>
        <div layout="row" flex ng-if="!vm.trollbox.name" class="join-area">
          <input type="text" placeholder="Name" ng-model="vm.name"></input>
          <button ng-click="vm.joinChat()" ng-disabled="!vm.name">Join</button>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope', 'trollbox', '$timeout')
class TraderTrollboxComponent {
  private name: string;
  private messageText: string;
  public messages: Array<TrollboxServiceMessage> = [];
  constructor(private $scope: angular.IScope,
              private trollbox: TrollboxService,
              private $timeout: angular.ITimeoutService) {
    trollbox.getMessages().then((messages) => {
      $scope.$evalAsync(() => {
        this.messages = messages;
      });
    });
    trollbox.subscribe((event)=> {
      $scope.$evalAsync(() => {
        this.messages.push(event);
      });
    }, $scope);
  }

  joinChat() {
    this.trollbox.join(this.name);
  }

  onTextAreaKeyPress($event: KeyboardEvent) {
    if ($event.keyCode == 13 && !$event.shiftKey) {
      this.trollbox.sendMessage(this.messageText).then(()=>{
        this.$scope.$evalAsync(()=>{
          this.messageText = "";
        })
      })
    }
  }
}