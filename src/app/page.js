'use client';
import { useState } from 'react';
import Image from "next/image";
import { Upload, Button, message, Modal, Form, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import axios from 'axios'

export default function Home() {
  const [form] = Form.useForm();
  const [flowerName, setFlowerName] = useState('');
  const [goodsName, setGoodsName] = useState('');
  
  const filedChange = (changedValues, allValues) => {
    const { flowerName, goodsName } = allValues;
    setFlowerName(flowerName);
    setGoodsName(goodsName);
  }
  
  // 获取SKC值
  const findStringAndNextWord = (str, target) => {
    if (!str) {
      return null
    }
    const regex = new RegExp(target + '(\\d+)');
    const match = str.match(regex);
    return match ? match[1] : null;
  }

  const downFile = (file, name) => {
    let blob = new Blob([file], { type: "application/zip" })
    let url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = name // 重命名文件
    link.click()
    URL.revokeObjectURL(url) // 释放内存
  }
   
   // 上传文件并解析成json
   
   const HandleImportFile = (info) => {
    const files = info.file;
    // 获取文件名称
    const name = files.name;
    // 获取文件后缀
    const suffix = name.substr(name.lastIndexOf('.'));
    const reader = new FileReader();
    reader.onload = async(event) => {
      try {
        // 判断文件类型是否正确
        if ('.xls' != suffix && '.xlsx' != suffix) {
          message.error('选择Excel格式的文件导入!');
          return false;
        }
        const { result } = event.target;
        // 读取文件
        const workbook = XLSX.read(result, { type: 'binary' });
        let data = [];
        // 循环文件中的每个表
        console.log('表格数据workbook：', workbook);
        for (const sheet in workbook.Sheets) {
          if (workbook.Sheets.hasOwnProperty(sheet)) {
            // 将获取到表中的数据转化为json格式
            console.log('XLSX.utils.sheet_to_json(workbook.Sheets[sheet])', XLSX.utils.sheet_to_json(workbook.Sheets[sheet]))
            data = data.concat(XLSX.utils.sheet_to_json(workbook.Sheets[sheet]));
          }
        }
        console.log('原始表格数据', data)
        
        // 表格数据处理 将表格数据转换为 { 商品信息: 'xxx', 数量: 78, .... }
        const keyObject = {
          '__EMPTY': "商品信息",
          '__EMPTY_1': "商品信息",
          '__EMPTY_2': "属性集",
          '__EMPTY_3': "SKU ID",
          '__EMPTY_5': "数量",
          '数量': "数量",
          'SKU ID': "SKU ID"
        }
        
        data = data.map(item => {
          const transResult = Object.keys(item).reduce((acc, cur) => {
            acc[keyObject[cur]]= item[cur]
            return acc
          }, {})
          // console.log('transResult', transResult)
          return transResult
        })

        if (data && data.length < 1) {
          message.error('表格中没有数据,请重新上传');
          return;
        }
        if (data && data.length > 0) {
          const result = data.reduce((acc, cur) => {
            const key = findStringAndNextWord(cur['商品信息'], 'SKC：')
            if (key) {
              acc[key] = cur['数量']
            }
            return acc
          }, {})
          console.log('result', Object.keys(result))
          info.onProgress({ percent: 100 }, info.file);
          info.onSuccess(info.res, info.file);
          axios.get('http://localhost:3001/getData', {
            params: result,
            responseType: 'blob',
            headers: {
              responseType: 'blob'
            }
          })
          .then(function (response) {
            console.log(response);
            if (response.status === 200) {
              if (response.data.type === 'application/zip') {
                downFile(response.data, flowerName)
                
              }
            } else {
              message.error('文件下载失败');
            }
            
          })
          .catch(function (error) {
            console.log(error);
          })
          .finally(function () {
            // always executed
          });

          axios.get('http://localhost:3001/getGoodsData', {
            params: result,
            responseType: 'blob',
            headers: {
              responseType: 'blob'
            }
          })
          .then(function (response) {
            console.log(response);
            if (response.status === 200) {
              if (response.data.type === 'application/zip') {
                downFile(response.data, goodsName)
              }
            } else {
              message.error('文件下载失败');
            }
            
          })
          .catch(function (error) {
            console.log(error);
          })
          .finally(function () {
            // always executed
          });


          axios.get('http://localhost:3001/getNoExistData', {
            params: result,
            headers: {
            }
          })
          .then(function (response) {
            console.log(response);
            if (response.status === 200) {
              console.log('response.data', response.data.data)
              const data = Object.keys(response.data.data).join(',')
              console.log('data', data)
              if(Object.keys(data).length > 0) {
                Modal.error({
                  title: '不存在的图片skc有：',
                  content: data
                })
              } else {
                Modal.success({
                  title: '导出成功，文件夹图片完整',
                  content: data
                })
              }
              
            } else {
              message.error('文件下载失败');
            }
            
          })
          .catch(function (error) {
            console.log(error);
          })
        }
      } catch (e) {
        console.error('e', e)
        message.error('文件类型不正确！');
      }
    };
    reader.readAsBinaryString(files);
  };
  const props = {
    name: 'file',
    action: 'https://www.mocky.io/v2/5cc8019d300000980a055e76',
    headers: {
      authorization: 'authorization-text',
    },
    maxCount: 1,
    onChange(info) {
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      // const result = info.file.raw;
      // const workbook = XLSX.read(result, { type: 'binary' });
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败.`);
      }
    },

    customRequest: HandleImportFile,
  };
  const readImageFile = async() => {
    const res = await window.showOpenFilePicker({
      types: [
        {
            description: 'Not JavaScript',
            accept: {
                'image/*': ['.py', '.js', '.html']
            },
        },
      ],
      // excludeAcceptAllOption: true,
      multiple: true,
      id: "thisGonnaBeDDrive" 
    })
    console.log('选取的图片文件信息', res)
  }
  return (
    <main className="min-h-screen ">
      <div  className="flex  justify-between p-24">
        {console.log('---', form.getFieldsValue('flowerName'))}
        <Upload {...props}>
          <Button type="primary" disabled={!flowerName || !goodsName} icon={<UploadOutlined />}>
            导入表格
          </Button>
          {(!flowerName || !goodsName) && <div>请先输入文件名</div>}
        </Upload>
      </div>
      
      <Form
        name="basic"
        form={form}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        autoComplete="off"
        onValuesChange={filedChange}
      >
        <Form.Item label="引花名" name="flowerName">
          <Input />
        </Form.Item>
        <Form.Item label="拣货名" name="goodsName">
          <Input />
        </Form.Item>
      </Form>
    </main>
  );
}
