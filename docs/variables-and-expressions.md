# Variables and Expressions

HTML text nodes are parsed for variables, or JavaScript expressions, between `{{` and `}}`. We can print the `heading` variable in uppercase:

```javascript
// "<h1>HELLO, WORLD!</h1>"
await new Hypermore().render(
  '<h1>{{ heading.toUpperCase() }}</h1>',
  { heading: 'Hello, World!' }
);
```

HTML attributes are also parsed and prop values are evaluated:

```javascript
const hypermore = new Hypermore();
hypermore.setTemplate(
  'my-component',
  '<h1>{{heading}}</h1>'
);
// "<h1>HELLO, WORLD!</h1>"
await hypermore.render(`<my-component heading="{{ 'Hello, World!'.toUpperCase() }}"/>`);
```

Component props passed as attributes are string type by default. Evaluated types are preserved, for example:

```javascript
const hypermore = new Hypermore();
hypermore.setTemplate('my-type', '{{typeof prop}}');
await hypermore.render(`
  <my-type prop="42"/>
  <my-type prop="{{42}}"/>
`);
```

This will output `string` and `number`.
