import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ShopFormService } from 'src/app/service/shop-form.service';
import { Country } from 'src/app/common/country';
import { State } from 'src/app/common/state';
import { ShopValidators } from 'src/app/validators/shop-validators';
import { CartService } from 'src/app/service/cart.service';
import { CheckoutService } from 'src/app/service/checkout.service';
import { Router } from '@angular/router';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { Purchase } from 'src/app/common/purchase';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  checkoutFormGroup: FormGroup;

  totalPrice: number = 0;
  totalQuantity: number = 0;

  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[] = [];

  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];

  storage: Storage = sessionStorage;

  constructor(private formBuilder: FormBuilder,
    private shopFormService: ShopFormService,
    private cartService: CartService,
    private checkoutService:CheckoutService,
    private router: Router) { }

  ngOnInit(): void {

    // read the users email address from browser storage
    const theEmail = JSON.parse(this.storage.getItem('userEmail')!);
    console.log(theEmail)

    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({

        firstName: new FormControl('', 
          [ Validators.required, 
          Validators.minLength(2), 
          ShopValidators.notOnlyWhitespace]),

        lastName: new FormControl('', 
          [ Validators.required, 
          Validators.minLength(2), 
          ShopValidators.notOnlyWhitespace]),

        email: new FormControl(theEmail,
            [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]),
      }),
      shippingAddress: this.formBuilder.group({
        street: new FormControl('', 
          [ Validators.required, Validators.minLength(4), ShopValidators.notOnlyWhitespace]),
        city: new FormControl('', 
          [ Validators.required, Validators.minLength(3), ShopValidators.notOnlyWhitespace]),
        state: new FormControl('', 
          [ Validators.required, Validators.minLength(3) ]),
        country: new FormControl('',
          [ Validators.required, Validators.minLength(5)]),
        zipCode: new FormControl('', [ Validators.required, Validators.minLength(5), ShopValidators.notOnlyWhitespace])
      }),

      billingAddress: this.formBuilder.group({
        street: new FormControl('', 
          [ Validators.required, Validators.minLength(4), ShopValidators.notOnlyWhitespace]),
        city: new FormControl('', 
          [ Validators.required, Validators.minLength(3), ShopValidators.notOnlyWhitespace]),
        state: new FormControl('', 
          [ Validators.required, Validators.minLength(3) ]),
        country: new FormControl('',
          [ Validators.required, Validators.minLength(5) ]),
        zipCode: new FormControl('', [ Validators.required, Validators.minLength(5), ShopValidators.notOnlyWhitespace])
      }),
      
      creditCard: this.formBuilder.group({
        cardType: new FormControl('', [ Validators.required]),
        nameOnCard: new FormControl('', 
          [ Validators.required, 
          Validators.minLength(2), 
          ShopValidators.notOnlyWhitespace]),
        cardNumber: new FormControl('', [Validators.pattern('[0-9]{16}')]),
        securityCode: new FormControl('', [Validators.pattern('[0-9]{3}')]),
        expirationMonth: [''],
        expirationYear: ['']
      })
    });

    // populate credit card months

    const startMonth: number = new Date().getMonth() + 1;
    console.log("startMonth: " + startMonth);

    this.shopFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        console.log("Retrieved credit card months: " + JSON.stringify(data));
        this.creditCardMonths = data;
      }
    );

    // populate credit card years

    this.shopFormService.getCreditCardYears().subscribe(
      data => {
        console.log("Retrieved credit card years: " + JSON.stringify(data));
        this.creditCardYears = data;
      }
    );

    // populate countries

    this.shopFormService.getCountries().subscribe(
      data => {
        console.log("Retrieved countries: " + JSON.stringify(data));
        this.countries = data;
      }
    );

    this.reviewCartDetails();
  }

  copyShippingAddressToBillingAddress(event) {

    if (event.target.checked) {
      console.log("ticked", this.checkoutFormGroup.controls['shippingAddress'].value)
      this.checkoutFormGroup.controls['billingAddress']
        .setValue(this.checkoutFormGroup.controls['shippingAddress'].value);
      console.log("ticked", this.checkoutFormGroup.controls['billingAddress'].value)

      this.billingAddressStates = this.shippingAddressStates;
    }
    else {
      this.checkoutFormGroup.controls['billingAddress'].reset();

      this.billingAddressStates = [];
    }

  }

  onSubmit() {
    console.log("Handling the submit button");

    if (this.checkoutFormGroup.invalid) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

    //set up order

    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;


    //get cart items
    const cartItems = this.cartService.cartItems;

    // create orderItems from cartItems
    // let orderItems: OrderItem[];

    // for(let i=0 ; i< cartItems.length ; i++) {
    //   orderItems[i] = new OrderItem(cartItems[i]);
    // }

    let orderItems : OrderItem[] = cartItems.map(tempCartItem => new OrderItem(tempCartItem));

    // set up purchase
    let purchase = new Purchase();

    //populate purchase - customer
    purchase.customer = this.checkoutFormGroup.controls['customer'].value;
    

    //populate purchase - shipping aaddress
    purchase.shippingAddress = this.checkoutFormGroup.controls['shippingAddress'].value;
    const shippingState:State= JSON.parse(JSON.stringify(purchase.shippingAddress.state));
    const shippingCountry:Country = JSON.parse(JSON.stringify(purchase.shippingAddress.country));
    purchase.shippingAddress.state = shippingState.name;
    purchase.shippingAddress.country = shippingCountry.name;
    
    


    //populate purchase - billing aaddress
    purchase.billingAddress = this.checkoutFormGroup.controls['billingAddress'].value;
    const billingState:State= JSON.parse(JSON.stringify(purchase.billingAddress.state));
    const billingCountry:Country = JSON.parse(JSON.stringify(purchase.billingAddress.country));
    purchase.billingAddress.state = billingState.name;
    purchase.billingAddress.country = billingCountry.name;

    //populate purchase - order and orderItems

    purchase.order = order;
    purchase.orderItems = orderItems;

    // call REST API via the CheckoutService

    this.checkoutService.placeOrder(purchase).subscribe({
        next: response => {
          alert(`Your order has been placed successfully! Order ID: ${response.orderTrackingNumber}`);

          this.resetCart();
        },
        error: err => {
          alert(`There is an error: ${err.message}`);
        }
      })

  }
  resetCart() {
    // reset cart data

    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);

    //reset the form data
    this.checkoutFormGroup.reset();

    localStorage.removeItem('cartItems');

    //navigate back to products page
    this.router.navigateByUrl("/products");

  }

  handleMonthsAndYears() {

    const creditCardFormGroup = this.checkoutFormGroup.get('creditCard');

    const currentYear: number = new Date().getFullYear();
    const selectedYear: number = Number(creditCardFormGroup.value.expirationYear);

    // if the current year equals the selected year, then start with the current month

    let startMonth: number;

    if (currentYear === selectedYear) {
      startMonth = new Date().getMonth() + 1;
    }
    else {
      startMonth = 1;
    }

    this.shopFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        console.log("Retrieved credit card months: " + JSON.stringify(data));
        this.creditCardMonths = data;
      }
    );
  }

  getStates(formGroupName: string) {

    const formGroup = this.checkoutFormGroup.get(formGroupName);

    const countryCode = formGroup.value.country.code;
    const countryName = formGroup.value.country.name;

    console.log(`${formGroupName} country code: ${countryCode}`);
    console.log(`${formGroupName} country name: ${countryName}`);

    this.shopFormService.getStates(countryCode).subscribe(
      data => {

        if (formGroupName === 'shippingAddress') {
          this.shippingAddressStates = data;
          console.log(data)
        }
        else {
          this.billingAddressStates = data;
          console.log(data)
        }

        // select first item by default
        formGroup.get('state').setValue(data[0]);
      }
    );
  }

  reviewCartDetails() {
    this.cartService.totalPrice.subscribe(
      totalPrice => this.totalPrice = totalPrice
    );

    this.cartService.totalQuantity.subscribe(
      totalQuantity => this.totalQuantity = totalQuantity
    );

  }

  get firstName() { return this.checkoutFormGroup.get('customer.firstName'); }

  get lastName() { return this.checkoutFormGroup.get('customer.lastName'); }

  get email() { return this.checkoutFormGroup.get('customer.email'); }



  get shippingAddressStreet() { return this.checkoutFormGroup.get('shippingAddress.street'); }

  get shippingAddressCity() { return this.checkoutFormGroup.get('shippingAddress.city'); }

  get shippingAddressState() { return this.checkoutFormGroup.get('shippingAddress.state'); }

  get shippingAddressCountry() { return this.checkoutFormGroup.get('shippingAddress.country'); }

  get shippingAddressZipCode() { return this.checkoutFormGroup.get('shippingAddress.zipCode'); }

  
  
  get billingAddressStreet() { return this.checkoutFormGroup.get('billingAddress.street'); }

  get billingAddressCity() { return this.checkoutFormGroup.get('billingAddress.city'); }

  get billingAddressState() { return this.checkoutFormGroup.get('billingAddress.state'); }

  get billingAddressCountry() { return this.checkoutFormGroup.get('billingAddress.country'); }

  get billingAddressZipCode() { return this.checkoutFormGroup.get('billingAddress.zipCode'); }

  
  get creditCardType() { return this.checkoutFormGroup.get('creditCard.cardType'); }
  get creditCardNameOnCard() { return this.checkoutFormGroup.get('creditCard.nameOnCard'); }
  get creditCardNumber() { return this.checkoutFormGroup.get('creditCard.cardNumber'); }
  get creditCardSecurityCode() { return this.checkoutFormGroup.get('creditCard.securityCode'); }


  
}
