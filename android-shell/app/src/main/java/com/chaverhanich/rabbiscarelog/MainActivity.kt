package com.chaverhanich.rabbiscarelog

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.provider.MediaStore
import android.view.KeyEvent
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import androidx.core.content.FileProvider
import java.io.File

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var offlineView: View

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var chooserParams: WebChromeClient.FileChooserParams? = null
    private var cameraOutputUri: Uri? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        offlineView = findViewById(R.id.offlineView)

        findViewById<Button>(R.id.retryButton).setOnClickListener {
            if (isOnline()) {
                offlineView.visibility = View.GONE
                webView.visibility = View.VISIBLE
                webView.loadUrl(START_URL)
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = false
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val scheme = url.scheme ?: return false
                if (scheme == "http" || scheme == "https") return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (e: Exception) {
                    true
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                view.visibility = View.VISIBLE
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    view.visibility = View.INVISIBLE
                    offlineView.visibility = View.VISIBLE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                chooserParams = params
                cameraOutputUri = null
                val accept = params?.acceptTypes?.filter { it.isNotBlank() }.orEmpty()
                val wantsImage = accept.isEmpty() || accept.any { it.startsWith("image/") || it == "*/*" }
                if (wantsImage && !hasCameraPermission()) {
                    requestPermissions(arrayOf(Manifest.permission.CAMERA), REQ_CAMERA_PERMISSION)
                    return true
                }
                openImageSource()
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val origin = request.origin?.toString().orEmpty()
                val allowed = origin.startsWith(START_URL) || origin.contains("pally.site")
                val wantsVideo = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                if (allowed && wantsVideo && hasCameraPermission()) {
                    request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                } else {
                    request.deny()
                }
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val message = resultMsg ?: return false
                val temp = WebView(this@MainActivity)
                temp.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                        webView.loadUrl(request.url.toString())
                        return true
                    }
                }
                val transport = message.obj as? WebView.WebViewTransport ?: return false
                transport.webView = temp
                message.sendToTarget()
                return true
            }
        }

        webView.loadUrl(START_URL)
    }

    private fun hasCameraPermission(): Boolean {
        return checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    private fun openImageSource() {
        val accept = chooserParams?.acceptTypes?.filter { it.isNotBlank() }.orEmpty()
        val wantsImage = accept.isEmpty() || accept.any { it.startsWith("image/") || it == "*/*" }

        val gallery = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (accept.size == 1) accept[0] else "*/*"
            if (accept.isNotEmpty()) putExtra(Intent.EXTRA_MIME_TYPES, accept.toTypedArray())
        }

        var camera: Intent? = null
        if (wantsImage && hasCameraPermission()) {
            camera = buildCameraIntent()
        }

        if (chooserParams?.isCaptureEnabled == true && camera != null) {
            try {
                startActivityForResult(camera, REQ_FILE_CHOOSER)
                return
            } catch (e: Exception) {
                cameraOutputUri = null
            }
        }

        val chooser = Intent.createChooser(gallery, getString(R.string.chooser_title)).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            if (camera != null) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(camera))
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
        }

        try {
            startActivityForResult(chooser, REQ_FILE_CHOOSER)
        } catch (e: Exception) {
            finishFileChooser(null)
        }
    }

    private fun buildCameraIntent(): Intent? {
        return try {
            val dir = File(cacheDir, "camera").apply { mkdirs() }
            val photo = File.createTempFile("carelog-", ".jpg", dir)
            val uri = FileProvider.getUriForFile(this, packageName + ".fileprovider", photo)
            cameraOutputUri = uri
            Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                clipData = ClipData.newRawUri("carelog-photo", uri)
            }
        } catch (e: Exception) {
            cameraOutputUri = null
            null
        }
    }

    private fun finishFileChooser(uris: Array<Uri>?) {
        val callback = filePathCallback
        filePathCallback = null
        chooserParams = null
        cameraOutputUri = null
        callback?.onReceiveValue(uris)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_CAMERA_PERMISSION) {
            if (filePathCallback != null) openImageSource()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_FILE_CHOOSER) {
            var result: Array<Uri>? = null
            if (resultCode == RESULT_OK) {
                val uris = ArrayList<Uri>()
                data?.data?.let { uris.add(it) }
                data?.clipData?.let { clip ->
                    for (i in 0 until clip.itemCount) {
                        clip.getItemAt(i)?.uri?.let { uris.add(it) }
                    }
                }
                if (uris.isEmpty()) cameraOutputUri?.let { uris.add(it) }
                if (uris.isNotEmpty()) result = uris.toTypedArray()
            }
            finishFileChooser(result)
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    companion object {
        private const val START_URL = "https://als-aide-care-log.pally.site"
        private const val REQ_FILE_CHOOSER = 1001
        private const val REQ_CAMERA_PERMISSION = 1002
    }
}
