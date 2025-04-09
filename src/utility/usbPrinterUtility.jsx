// Epson USB Vendor ID
const EPSON_VENDOR_ID = 0x04b8;  //Version 135.0.7049.42 (Official Build) (64-bit)

export const initializeUSBPrinter = async () => {
  try {
    // Check if WebUSB is available
    if (!navigator.usb) {
      throw new Error('WebUSB not supported in this browser');
    }

    // Request USB device access
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: EPSON_VENDOR_ID }]
    });
    
    await device.open();
    
    // Try different configurations if needed
    let configuration;
    try {
      configuration = 1;
      await device.selectConfiguration(configuration);
    } catch (e) {
      configuration = 0;
      await device.selectConfiguration(configuration);
    }
    
    await device.claimInterface(0);
    
    return device;
  } catch (error) {
    console.error('USB printer initialization failed:', error);
    throw error;
  }
};

export const printReceiptViaUSB = async (device, billData, subtotal, tax, total) => {
  try {
    // ESC/POS commands
    const commands = [];
    
    // Helper function to add text
    const addText = (text) => {
      for (let i = 0; i < text.length; i++) {
        commands.push(text.charCodeAt(i));
      }
    };

    // Initialize printer
    commands.push(0x1B, 0x40); // ESC @ - Initialize
    
    // Set alignment to center
    commands.push(0x1B, 0x61, 0x01); // ESC a n
    
    // Set text size to double height and width
    commands.push(0x1D, 0x21, 0x30); // GS ! n
    
    // Add header
    addText("RESTAURANT NAME\n");
    
    // Reset text size
    commands.push(0x1D, 0x21, 0x00);
    
    addText("123 Main Street\n");
    addText("City, State ZIP\n");
    addText("Tel: 123-456-7890\n\n");
    
    // Set alignment to left
    commands.push(0x1B, 0x61, 0x00);
    
    addText("--------------------------------\n");
    addText(`Date: ${new Date().toLocaleString()}\n`);
    addText(`Section: ${billData.section}\n`);
    addText(`Table: ${billData.tableNumber}\n`);
    addText("--------------------------------\n");
    
    // Add items header
    addText("ITEM            QTY  PRICE  TOTAL\n");
    addText("--------------------------------\n");
    
    // Add items
    billData.groupedItems.forEach(item => {
      const name = item.submenu.length > 16 ? 
        item.submenu.substring(0, 13) + '...' : 
        item.submenu;
      const portion = item.portion ? `(${item.portion})` : '';
      
      addText(`${name}${portion}\n`);
      addText(`               ${item.quantity}   ¥${item.price.toFixed(2)}  ¥${(item.price * item.quantity).toFixed(2)}\n`);
    });
    
    // Add totals
    addText("--------------------------------\n");
    addText(`SUBTOTAL:               ¥${subtotal.toFixed(2)}\n`);
    addText(`TAX (18%):               ¥${tax.toFixed(2)}\n`);
    addText(`TOTAL:                   ¥${total.toFixed(2)}\n\n`);
    
    // Add thank you message (centered)
    commands.push(0x1B, 0x61, 0x01);
    addText("Thank you for dining with us!\n");
    addText("Please come again!\n\n\n");
    
    // Cut paper (partial cut)
    commands.push(0x1B, 0x64, 0x02); // ESC d n
    
    // Send data to printer
    const result = await device.transferOut(1, new Uint8Array(commands));
    console.log('Print result:', result);
    
  } catch (error) {
    console.error('Printing failed:', error);
    throw error;
  }
};