class BTCCurrency implements ICurrency {

  private btcBlockExplorerService: BtcBlockExplorerService
  public symbol = 'BTC'
  public homePath
  private pendingTransactions: BitcoinPendingTransactionsService
  private user: UserService

  constructor(public secretPhrase: string, public address: string) {
    this.btcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/bitcoin-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('bitcoinPendingTransactions')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.btcBlockExplorerService.getBalance(this.address).then(
      balance => {
        let balanceUnconfirmed = parseFloat(balance) / 100000000;
        return utils.commaFormat(new Big(balanceUnconfirmed+"").toFixed(8))
      }
    )
  }

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: ()=>void): ()=>void {
    return function () {}
  }

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged() {
  }

  /* Invoke SEND currency dialog */
  invokeSendDialog($event) {
    this.sendBtc($event).then(
      data => {
        let address = this.user.account
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txId, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send BTC Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendBtc($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        let user = <UserService> heat.$inject.get('user')
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')

        let amountInSatoshi = new Big($scope['vm'].data.amount).times('100000000').toFixed(0);
        let feeInSatoshi = new Big($scope['vm'].data.fee).times('100000000').toFixed(0);

        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.secretPhrase}
        let to = $scope['vm'].data.recipient

        let txObject = {
          from: addressPrivateKeyPair.address,
          to: to,
          amount: parseInt(amountInSatoshi),
          fee: parseInt(feeInSatoshi),
          changeAddress: addressPrivateKeyPair.address,
          privateKey: addressPrivateKeyPair.privateKey
        }
        $scope['vm'].disableOKBtn = true
        bitcoreService.sendBitcoins(txObject).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `TxId: ${data.txId}`);
            })
          },
          err => {
            $mdDialog.hide(null).then(() => {
              dialogs.alert(event, 'Error', err.message);
            })
          }
        )
      }
      $scope['vm'].disableOKBtn = false

      let defaultFee = '0.0005'
      $scope['vm'].data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        fee: defaultFee,
        feeBlocks: 5
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getAddressInfo($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = info.balance.toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} BTC`
            })
          },
          error => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = error.message||'Invalid'
            })
          }
        )
      }, 1000, false)
      $scope['vm'].recipientChanged = function () {
        $scope['vm'].data.recipientInfo = ''
        lookup()
      }

      $scope['vm'].getEstimatedFee = () => {
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
        let numberOfBlocks = $scope['vm'].data.feeBlocks
        $scope['vm'].data.fee = 'loading ...'
        btcBlockExplorerService.getEstimatedFee(numberOfBlocks).then(
          data => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.fee = data || defaultFee;
            })
          },
          () => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.fee = defaultFee;
            })
          }
        )
      }
      $scope['vm'].getEstimatedFee();
    }

    let $q = heat.$inject.get('$q')
    let $mdDialog = <angular.material.IDialogService> heat.$inject.get('$mdDialog')

    let deferred = $q.defer<{ txId:string }>()
    $mdDialog.show({
      controller: DialogController2,
      parent: angular.element(document.body),
      targetEvent: $event,
      clickOutsideToClose:false,
      controllerAs: 'vm',
      template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Send BTC</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in BTC</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in BTC</label>
                  <input ng-model="vm.data.fee" required name="fee">
                </md-input-container>

                <!-- <md-input-container flex>
                  <label>Confirmation time</label>
                  <md-select ng-model="vm.data.feeBlocks" ng-change="vm.getEstimatedFee()">
                    <md-option value="2">Confirm in 2 blocks</md-option>
                    <md-option value="3">Confirm in 3 blocks</md-option>
                    <md-option value="4">Confirm in 4 blocks</md-option>
                    <md-option value="5">Confirm in 5 blocks</md-option>
                    <md-option value="6">Confirm in 6 blocks</md-option>
                    <md-option value="7">Confirm in 7 blocks</md-option>
                    <md-option value="8">Confirm in 8 blocks</md-option>
                    <md-option value="9">Confirm in 9 blocks</md-option>
                    <md-option value="10">Confirm in 10 blocks</md-option>
                    <md-option value="15">Confirm in 15 blocks</md-option>
                    <md-option value="20">Confirm in 20 blocks</md-option>
                  </md-select>
                  <span>Fee is calculated based on realtime data, faster Confirmation Time means higher fee</span>
                </md-input-container> -->
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }


}