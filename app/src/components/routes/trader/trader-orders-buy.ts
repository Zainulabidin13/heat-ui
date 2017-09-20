///<reference path='../../VirtualRepeatComponent.ts'/>
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
  selector: 'traderOrdersBuy',
  inputs: ['currencyInfo','assetInfo','selectedOrder'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Buy {{vm.assetInfo.symbol}}&nbsp;
        <span flex></span>
        <span class="balance" ng-if="vm.user.unlocked">BALANCE: {{vm.currencyBalance}}&nbsp;{{vm.currencyInfo.symbol}}</span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column" ng-if="vm.currencyInfo&&vm.assetInfo">
        <md-list-item class="header">
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col quantity-col">Quantity</div>
          <div class="truncate-col total-col">Total</div>
          <div class="truncate-col sum-col">Sum ({{vm.currencyInfo.symbol}})</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper  class="content">
          <md-list-item md-virtual-repeat="item in vm" md-on-demand
               ng-click="vm.select(item)" aria-label="Entry"
               ng-class="{'virtual': item.unconfirmed, 'currentlyNotValid': item.currentlyNotValid||item.cancelled}">
            <div class="truncate-col price-col">{{item.priceDisplay}}</div>
            <div class="truncate-col quantity-col">{{item.quantityDisplay}}</div>
            <div class="truncate-col total-col">{{item.total}}</div>
            <div class="truncate-col sum-col">{{item.sum}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','ordersProviderFactory','$q','heat','user')
class TraderOrdersBuyComponent extends VirtualRepeatComponent  {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input

  currencyBalance: string = "*"; // formatted currency balance

  PAGE_SIZE = 250; /* VirtualRepeatComponent @override */

  refreshGrid: ()=>void;

  constructor(protected $scope: angular.IScope,
              private ordersProviderFactory: OrdersProviderFactory,
              $q: angular.IQService,
              private heat: HeatService,
              private user: UserService)
  {
    super($scope, $q);

    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {

        /* initialize virtual repeat component */
        this.initializeVirtualRepeat(
          this.ordersProviderFactory.createProvider(this.currencyInfo.id, this.assetInfo.id, null, false),

          /* decorator */
          (order: IHeatOrder|any, context: any) => {
            order.priceDisplay = utils.formatQNT(order.price,this.currencyInfo.decimals);
            order.quantityDisplay = utils.formatQNT(order.unconfirmedQuantity,this.assetInfo.decimals);
            var totalQNT = utils.calculateTotalOrderPriceQNT(order.unconfirmedQuantity, order.price);
            order.total = utils.formatQNT(totalQNT,this.currencyInfo.decimals);
          },

          /* preprocessor */
          (firstIndex: number, lastIndex: number, items: Array<IHeatOrder>) => {
            if (firstIndex == 0) {
              items.forEach((order)=> {
                if (order['runningTotalQNT']) {
                  order['sum'] = utils.formatQNT(order['sumQNT'].toString(), this.currencyInfo.decimals);
                  order['runningTotal'] = utils.formatQNT(order['runningTotalQNT'].toString(), this.assetInfo.decimals);
                }
              });
            }
          }
        );

        /* stop watching the currenyInfo and assetInfo */
        unregister.forEach(fn => fn());

        /* listen to order events */
        this.subscribeToOrderEvents(this.currencyInfo.id, this.assetInfo.id);

        if (this.user.unlocked) {
          this.updateCurrencyBalance();
          /* listen to balance events */
          this.subscribeToBalanceEvents(this.user.account, this.currencyInfo.id);
        }
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];

    this.refreshGrid = utils.debounce(angular.bind(this, this.determineLength), 1000, false);
  }

  private subscribeToOrderEvents(currency: string, asset: string) {
    this.heat.subscriber.order({currency: currency, asset: asset}, (order: IHeatOrder) => {
      if (order.type == 'bid') {
        this.refreshGrid();
      }
    }, this.$scope);
  }

  private subscribeToBalanceEvents(account:string, currency: string) {
    var refreshBalance = utils.debounce(angular.bind(this, this.updateCurrencyBalance), 500, false);
    this.heat.subscriber.balanceChanged({account:account, currency:currency}, refreshBalance, this.$scope);
  }

  onSelect(selectedOrder) {
    this.selectedOrder = selectedOrder;
  }

  updateCurrencyBalance() {
    this.heat.api.getAccountBalanceVirtual(this.user.account, this.currencyInfo.id, "0",1).then((balance)=>{
      this.$scope.$evalAsync(()=> {
        this.currencyBalance = utils.formatQNT(balance.virtualBalance, this.currencyInfo.decimals);
      });
    },()=>{
      this.$scope.$evalAsync(()=> {
        this.currencyBalance = "?";
      });
    })
  }
}