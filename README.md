# datorama-d3-einstein-explorer
Custom widget for Datorama. Visualises insights from Einstein Marketing Insights bots in the workspace.

This custom widget loads bots in the workspace and visualises their insights. It can either be used as an open 'explorer', or limited to a single bot.

![Preview image](image.png)

## Style and Script Dependencies
Add `emiExplorer.initialize();` to the JS section, and add the below dependencies to the second tab of the Custom Widget Editor.

Script dependencies (must be loaded in this order):
1. `https://d3js.org/d3.v5.min.js`
2. `https://dato-custom-widgets-js-css.s3.eu-west-2.amazonaws.com/einstein-explorer/Einstein+Explorer.js`

Style depenency:
1. `https://dato-custom-widgets-js-css.s3.eu-west-2.amazonaws.com/einstein-explorer/Einstein+Explorer.css`

**The next few steps are mandatory**, but you'll need to see what you're working with, so this part is first. The initialization code must be placed at the very end of the JS - paste other parts before it.

## Preferences
Add this code to the JS section of the Custom Widget Editor.
```
// Set loading preferences
var prefs = {
'restrictToBots': [], // Comma-separated bot IDs
'loadDefaultBot': {
'botId': null, // Bot ID if using, otherwise null
'lockedToBot': false // true or false
},
'basicNames': false // true: don't automatically replace system names with display names, instead use only the formatNames definitions; false: do
};
```

`restrictToBots` causes only certain bots to load, if any IDs are in the list.

`loadDefaultBot.botId` is the ID of the bot you wish to load. You can get this from the URL after opening the bot in Analyze & Act.

`loadDefaultBot.lockedToBot`, if `false`, will give you an exit button to go back to the bot list. If `true`, there will be no button.

The EMI custom widget API returns non-user-friendly system names. Some can be replaced with code (explained later), and some can be replaced automatically with display names. If you prefer to use names other than display names, you can set `basicNames` to `true` to skip the automatic name replacement step and expose the underlying system names, helping you identify how to set up the conditions.

## Number Format Locale
If your number locale uses dot for decimals, comma for thousands separators, and dollars for currency, you don't need to follow this step.

Add this code to the JS section of the Custom Widget Editor.
```
// Set default number locale
d3.formatDefaultLocale({
'decimal': '.', // the decimal point (e.g., ".")
'thousands': ',', // the group separator (e.g., ",")
'grouping': [3], // the array of group sizes (e.g., [3]), cycled as needed
'currency': ['$', ''], // the currency prefix and suffix (e.g., ["$", ""])
'numerals': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], // an array of ten strings to replace the numerals 0-9
'percent': '%', // the percent sign
'minus': '-', // the minus sign
'nan': 'NaN' // the not-a-number value
});
```

To fit your local number format, you might need to edit the `decimal`, `thousands`, and `currency` values here (and perhaps others).

## Replacing System Names
If you load the widget before taking the rest of the steps, you might see names like 'KPI', 'MONTH_OVER_MONTH', and 'WEEK_OVER_WEEK'. These are system names that need to be replaced. Names of dimensions and measurements are automatically replaced with their display names, but sometimes these display names are undesirable.

To fix that, add this snippet to the JS section of the Custom Widget Editor. This snippet has a few already added to replace names of insight types.

To fix names of entities that have undesirable display names, add more `case`/`return` statements with the system name in the `case` parameter (add them before the final `default` statement). Changing your `prefs` code to have `basicNames` as `true` will help with this, as the automatic name replacement will be skipped, exposing the system name.
```
// Set formatting functions
function formatNames(name) {
  switch(name) {
    case 'KPI':
      return 'Performance';
    case 'WEEK_OVER_WEEK':
      return 'Week Over Week';
    case 'MONTH_OVER_MONTH':
    return 'Month Over Month';
    default:
      return name;
  }
}
```

## Formatting Raw Numbers
Only one change is mandatory here, and that's the first 'Percent' case. This is for the calculated %-change numbers. Everything else is formatted according to each metric's default display settings, but large numbers such as Impressions don't lend themselves well to the compact design of this widget, so should be adjusted.

To do that, add this snippet to the JS section of the Custom Widget Editor. Again, this has a few examples to get you started. See below for more examples.
```
function formatMetrics(name, value) {
  switch(name) {
    case 'Percent':
      return d3.format(',.1%')(value);
    case 'DELIVERY_CTR':
      return d3.format(',.3%')(value);
    case 'DELIVERY_IMPRESSIONS':
      return d3.format('.3s')(value);
    case 'DELIVERY_CLICKS':
      return d3.format('.3s')(value);
    default:
      return value;
  }
}
```

The first case 'Percent' statement controls how to format numbers in text like "% of total" or "increased by %".

Here are some more examples to get you familiar with how this format code works:

* d3.format(',.1%')(1.65091) -> 165.1%
* d3.format(',.2%')(1.65091) -> 165.09%
* d3.format(',.3%')(1.65091) -> 165.091%
* d3.format('$.2f')(993710) -> $990710.00
* d3.format('$,.2f')(993710) -> $990,710.00
* d3.format('$.2s')(993710) -> $990k
* d3.format('$.3s')(993710) -> $993k
* d3.format('.2f')(1203543.346) -> 1203543.35
* d3.format(',.2f')(1203543.346) -> 1,203,543.35
* d3.format(',.0f')(1203543.346) -> 1,203,543
* d3.format('.2s')(1203543.346) -> 1.2M
* d3.format('.3s')(1203543.346) -> 1.20M

For more, [see d3-format](https://github.com/d3/d3-format#d3-format), and [play with an interactive example](http://bl.ocks.org/zanarmstrong/05c1e95bf7aa16c4768e).

If you changed your locale preferences earlier, don't use your local symbols in the format function - always use comma for thousands, dot for decimal, and $ for currency. The output will conform to whatever you set in your locale.
