#!/usr/bin/env python3
"""Simulador Modbus TCP local — 127.0.0.1:502 (lab IMPETUS, mesmo host)."""
import logging
from pymodbus.datastore import ModbusDeviceContext, ModbusSequentialDataBlock, ModbusServerContext
from pymodbus.server import StartTcpServer

logging.basicConfig(level=logging.INFO)
log = logging.getLogger('impetus-modbus-lab')

def main():
    # Holding registers 0..99 com valores de exemplo
    hr = ModbusSequentialDataBlock(1, [100, 220, 350, 42] + [0] * 96)
    store = ModbusDeviceContext(hr=hr, ir=hr)
    context = ModbusServerContext(devices=store, single=True)
    log.info('Modbus TCP lab em 127.0.0.1:502 (unit_id=1)')
    StartTcpServer(context=context, address=('127.0.0.1', 502))

if __name__ == '__main__':
    main()
